#pragma once
#include <unistd.h>
#include <stdexcept>
typedef unsigned char uuid_t[16];
inline void uuid_generate(uuid_t out) {
  if (getentropy(out, 16) != 0) throw std::runtime_error("random source unavailable");
  out[6] = (out[6] & 15) | 64;
  out[8] = (out[8] & 63) | 128;
}
