"""Local dev API checks. Run with the workspace venv for native DSS comparison."""
import argparse
import json
import pathlib
import urllib.error
import urllib.parse
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:5173')
parser.add_argument('--ieee-dir', type=pathlib.Path)
args = parser.parse_args()
assert urllib.parse.urlparse(args.base_url).hostname in ('127.0.0.1', 'localhost'), 'Local preview only'
base = args.base_url.rstrip('/')
client = urllib.request.build_opener()
assert json.load(client.open(base + '/api/engine', timeout=60))['ok']
assert client.open(base + '/', timeout=60).code == 200
source = '''Clear
New Circuit.Check BasekV=12.47 pu=1.0 Phases=3 Bus1=source MVAsc3=1000 MVAsc1=1000
New Line.L1 Bus1=source Bus2=load Phases=3 R1=0.1 X1=0.2 R0=0.3 X0=0.6 C1=0 C0=0 Length=1 Units=km
New Load.Load1 Bus1=load Phases=3 Conn=wye kV=12.47 kW=500 PF=0.95
Set VoltageBases=[12.47]
CalcVoltageBases
Solve
'''

def request(payload, expected=200, origin=base):
    req = urllib.request.Request(base + '/api/engine', json.dumps(payload).encode(), {'Content-Type': 'application/json', 'Origin': origin})
    try:
        response = client.open(req, timeout=60)
    except urllib.error.HTTPError as error:
        response = error
    body = response.read().decode()
    assert response.code == expected, (response.code, body[:500])
    data = json.loads(body) if response.headers.get('Content-Type', '').startswith('application/json') else body
    return data

def model(text=source, **options):
    return dict(files=[dict(name='main.dss', content=text)], entry='main.dss', **options)

first = request(model())
assert first['converged'] and len(first['buses']) == 2
fault = request(model(analysis='faultstudy'))
assert fault['mode'] == 'Faultstudy' or fault['mode'].lower() == 'faultstudy', fault['mode']
assert min(fault['buses'][1]['faultAmps']) > 1000
report = request(model(commands='Solve\nShow Voltages LN Nodes\nExport Voltages'))
assert any('voltage' in item['name'].lower() for item in report['reports']), report['reports']
request(model('Clear\nThisIsNotACommand\n'), 422)
request(model('Clear\nRedirect missing.dss\n'), 422)
request(model(), 403, 'https://example.invalid')
request(dict(files=[dict(name='../main.dss', content=source)], entry='../main.dss'), 422)
request(model(commands='NewActor'), 422)
for path in ('/tmp', '/dev/shm'):
    outside = request(model(commands='Set DataPath=' + path + '\nExport Voltages'))
    assert outside['reports'] == [], outside['reports']
other = request(model(source.replace('Circuit.Check', 'Circuit.Other').replace('kW=500', 'kW=750')))
assert other['circuit'] == 'other' and other['power'][0] > 749
again = request(model())
assert again['circuit'] == 'check' and again['reports'] == []
assert max(abs(a-b) for a,b in zip(first['power'], again['power'])) < 1e-8
dump = request(model(commands='Solve\nDump'))
assert any('propertydump' in item['name'].lower() for item in dump['reports']), dump['reports']
saved = request(model(commands='Solve\nSave Circuit Dir=saved'))
assert any(item['name'].lower() == 'saved/master.dss' for item in saved['reports']), saved['reports']
for blocked in ('Distribute kw=100', 'Refine_BusLevels', 'Tear_Circuit', 'Export Sections'):
    request(model(commands='Solve\n' + blocked), 422)
daily = request(model(commands='Set Mode=Daily\nSolve', analysis='script'))
assert daily['mode'] == 'Daily', daily['mode']
plotted = request(dict(files=[dict(name='main.dss', content=source), dict(name='coords.csv', content='source,0,0\nload,1000,0\n')], entry='main.dss', commands='Buscoords coords.csv\nNew EnergyMeter.Head Element=Line.L1 Terminal=1\nSolve'))
assert len(plotted['coords']) == 2 and plotted['profile'], (plotted['coords'], plotted['profile'][:2])
assert not any(item['name'].startswith('__plot_') for item in plotted['reports']), plotted['reports']
uncompiled = request(model('Clear\nNew Circuit.Unsolved BasekV=12.47\n', action='compile'))
assert uncompiled['circuit'] == 'unsolved'

try:
    from opendssdirect import dss
except ImportError:
    print('Native comparison skipped: install OpenDSSDirect.py to enable it.')
else:
    dss.Text.Commands(source)
    reference = dss.Circuit.AllBusMagPu()
    actual = [value for bus in first['buses'] for value in bus['pu']]
    assert len(actual) == len(reference)
    assert max(abs(a-b) for a,b in zip(reference, actual)) < 1e-7
    dss.Solution.Mode(9)
    dss.Solution.Solve()
    for bus in fault['buses']:
        dss.Circuit.SetActiveBus(bus['name'])
        currents = dss.Bus.Isc()
        amps = [abs(complex(*currents[i:i+2])) for i in range(0, len(currents), 2)]
        assert max(abs(a-b) for a,b in zip(amps, bus['faultAmps'])) < 0.1
    if args.ieee_dir:
        files = [dict(name=p.name, content=p.read_text(errors='replace')) for p in args.ieee_dir.iterdir() if p.suffix.lower() in ('.dss', '.csv', '.dat')]
        ieee = request(dict(files=files, entry='IEEE123Master.dss'))
        dss.Text.Command('Compile "' + str(args.ieee_dir.resolve() / 'IEEE123Master.dss') + '"')
        dss.Solution.Solve()
        assert ieee['converged'] and len(ieee['buses']) == 132
        native = dss.Circuit.AllBusMagPu()
        wasm = [value for bus in ieee['buses'] for value in bus['pu']]
        assert len(native) == len(wasm)
        error = max(abs(a-b) for a,b in zip(native, wasm))
        assert error < 1e-7, error
        print('IEEE 123: voltage error', error, 'p.u.;', ieee['elapsedMS'], 'ms')
print('PASS: anonymous page/API, snapshot, fault, reports, editor commands, save circuit, blocked commands, script mode, plot data, invalid/recovery, origin, readonly FS, state cleanup, unsolved compile')
