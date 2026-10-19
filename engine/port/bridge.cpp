#include <emscripten/emscripten.h>
#include <cmath>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include "DSSGlobals.h"
#include "Executive.h"
#include "Circuit.h"
#include "Solution.h"
#include "Utilities.h"
#include "Bus.h"
#include "Dynamics.h"
#include "CktElement.h"

using namespace DSSGlobals;
static std::string response;

static std::string quote(const std::string& text) {
  std::string out="\"";
  const char* hex="0123456789abcdef";
  for(unsigned char c:text) {
    if(c=='"' || c=='\\') { out+='\\'; out+=c; }
    else if(c<32) { out+="\\u00"; out+=hex[c>>4]; out+=hex[c&15]; }
    else out+=c;
  }
  return out+'"';
}
static void number(std::ostream& out,double value) {
  if(std::isfinite(value)) out << std::setprecision(15) << value;
  else out << "null";
}
static void command(const std::string& text) {
  ErrorNumber=0; LastErrorMessage.clear(); ErrorStrings[1].clear();
  DSSExecutive[1]->Set_Command(text);
  if(ErrorNumber || !LastErrorMessage.empty()) throw std::runtime_error(LastErrorMessage.empty()?GlobalResult:LastErrorMessage);
}

extern "C" {
EMSCRIPTEN_KEEPALIVE const char* DSS_Run(const char* entry,const char* extra,int fault,int compileOnly) {
  try {
    ActiveActor=1; AllActors=false; Parallel_enabled=false; NoFormsAllowed=true; IsDLL=true; UpdateRegistry=false; AutoDisplayShowReport=false; AutoShowExport=false;
    if(!DSSExecutive[1]) { DSSExecutive[1]=new TExecutive(); DSSExecutive[1]->CreateDefaultDSSItems(); }
    SetCurrentDir("/work"); DataDirectory[1]="/work/"; OutputDirectory[1]="/work/";
    command("clear");
    command(std::string("compile \"")+entry+"\"");
    if(!ActiveCircuit[1]) throw std::runtime_error("No circuit was created");
    std::istringstream input(extra?extra:""); std::string line;
    while(std::getline(input,line)) if(line.find_first_not_of(" \t\r")!=std::string::npos) command(line);
    if(!compileOnly) { command(fault?"set mode=faultstudy":"set mode=snapshot"); command("solve"); }
    auto* circuit=ActiveCircuit[1]; auto* solution=circuit->Solution;
    if(circuit->NumBuses>2000 || circuit->CktElements.get_myNumList()>5000) throw std::runtime_error("Model limit: 2000 buses and 5000 elements");
    std::ostringstream out;
    out << "{\"ok\":true,\"circuit\":" << quote(circuit->Get_Name());
    out << ",\"converged\":" << (solution->ConvergedFlag?"true":"false");
    out << ",\"mode\":" << quote(Utilities::GetSolutionModeIDName(solution->Get_SolMode()));
    out << ",\"iterations\":" << solution->Iteration << ",\"frequency\":";
    number(out,solution->get_FFrequency());
    auto power=Utilities::GetTotalPowerFromSources(1); auto loss=circuit->Get_Losses(1);
    out << ",\"power\":["; number(out,power.re/1000); out << ','; number(out,power.im/1000); out << ']';
    out << ",\"losses\":["; number(out,loss.re/1000); out << ','; number(out,loss.im/1000); out << ']';
    out << ",\"buses\":[";
    for(int i=0;i<circuit->NumBuses;i++) {
      if(i) out << ',';
      auto* bus=circuit->Buses[i]; const int count=bus->get_FNumNodesThisBus();
      out << "{\"name\":" << quote(circuit->BusList.Get(i+1)) << ",\"baseKV\":"; number(out,bus->kVBase);
      out << ",\"nodes\":[";
      for(int j=1;j<=count;j++) { if(j>1) out << ','; out << bus->GetNum(j); }
      out << "],\"volts\":[";
      for(int j=1;j<=count;j++) { if(j>1) out << ','; auto ref=bus->GetRef(j); number(out,ref<(int)solution->NodeV.size()?Ucomplex::cabs(solution->NodeV[ref]):0); }
      out << "],\"pu\":[";
      for(int j=1;j<=count;j++) { if(j>1) out << ','; auto ref=bus->GetRef(j); number(out,bus->kVBase>0 && ref<(int)solution->NodeV.size()?Ucomplex::cabs(solution->NodeV[ref])/(bus->kVBase*1000):0); }
      out << "],\"faultAmps\":[";
      if(solution->Get_SolMode()==Dynamics::FAULTSTUDY) for(int j=0;j<count;j++) { if(j) out << ','; number(out,j<(int)bus->BusCurrent.size()?Ucomplex::cabs(bus->BusCurrent[j]):0); }
      out << "]}";
    }
    out << "],\"elements\":[";
    for(int i=1;i<=circuit->CktElements.get_myNumList();i++) {
      if(i>1) out << ',';
      auto* element=(CktElement::TDSSCktElement*)circuit->CktElements.Get(i);
      std::vector<Ucomplex::complex> currents(element->Fnterms*element->Fnconds);
      element->GetCurrents(currents.data(),1);
      auto p=element->Get_Power(1,1); auto l=element->Get_Losses(1);
      out << "{\"name\":" << quote(Utilities::FullName(element)) << ",\"phases\":" << element->Fnphases << ",\"buses\":[";
      for(int j=1;j<=element->Fnterms;j++) { if(j>1) out << ','; out << quote(element->GetBus(j)); }
      out << "],\"amps\":[";
      for(int j=0;j<element->Fnconds;j++) { if(j) out << ','; number(out,Ucomplex::cabs(currents[j])); }
      out << "],\"kw\":"; number(out,p.re/1000); out << ",\"kvar\":"; number(out,p.im/1000); out << ",\"lossKW\":"; number(out,l.re/1000); out << '}';
    }
    out << "],\"engine\":" << quote("EPRI OpenDSS-C " + VersionString + " / experimental WASM port");
    out << ",\"message\":" << quote(GlobalResult) << '}';
    response=out.str();
  } catch(const std::exception& error) { response="{\"error\":"+quote(error.what())+"}"; }
  return response.c_str();
}
EMSCRIPTEN_KEEPALIVE void DSS_Clear() {
  if(DSSExecutive[1]) { DSSExecutive[1]->Set_RecorderOn(false); DSSExecutive[1]->Clear(); }
  GlobalResult.clear(); LastErrorMessage.clear();
}
}
