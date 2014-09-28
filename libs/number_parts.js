/*
  These functions may or may not be useful.
  Some functions make use of ldexp() and frexp()
*/

// Might be defined too far away
if(typeof Little === 'undefined'){
  Little = (function(){
      return {
          double_int : new DataView(new ArrayBuffer(8)),
          lgamma_sign : 1
      }
  })();
}

Number.prototype.getSignBit = function(){
    "use asm";
    var high = 0 >>> 0;
    double_int.setFloat64(0, x);
    high = double_int.getUint32(4);
    return (high & 0x80000000);
};
Number.prototype.getLowWord = function(){
    double_int.setFloat64(0, this);
    return double_int.getUint32(4);
};
Number.prototype.setLowWord = function(an_uint32){
    double_int.setFloat64(0, this);
    double_int.setUint32(0,an_uint32);
    this = double_int.getFloat64(0);
};
Number.prototype.getHighWord = function(){
    double_int.setFloat64(4, this);
    return double_int.getUint32(0);
};
Number.prototype.setHighWord = function(an_uint32){
    double_int.setFloat64(0, this);
    double_int.setUint32(4,an_uint32);
    this = double_int.getFloat64(0);
};
Number.prototype.getExponent = function(){
    return frexp(this)[1];
};
Number.prototype.setExponent = function(a_number){
    this = ldexp(a_number, frexp(this)[1]);
};
Number.prototype.getMantissa = function(){
    return frexp(this)[0];
};
Number.prototype.setMantissa = function(an_uint32){
    this = ldexp(frexp(this)[0],an_uint32);
};
