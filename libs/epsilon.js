/*
  Function to evaluate the size of one ulp
  for use when comnparing zeros which might
  not be exactly zeros
*/
Math.EPSILON = (function (){
  var tmp1    = 1.0;
  var tmp2    = 0.0;
  var EPSILON = 0.0;
  do{
    EPSILON = tmp1;
    tmp1  /= 2;
    tmp2   = 1.0 + tmp1;
  }while (tmp2 > 1.0);
  return EPSILON;
})();
