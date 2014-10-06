Number.prototype.isPerfPow = function(nroot){
  // check if it is an positive integer ommitted
  var primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53];
  var root,log2,t;
  t = Math.abs(this);
  log2 = Math.floor(Math.log(t)/Math.LN2);
  // reduces the number of tries to 11. at most
  if(this.isPow2()) return true;
  // sqrt is optimized in most cases, so try it first
  root = Math.round(Math.sqrt(t));
  if(t - (root * root) == 0){
    if(arguments.length  > 0){
      nroot[0] = root;
      nroot[1] = 2;
    }
    return true
  }
  // cube root is only in the next ECMAScript standard, sadly
  for(var i=1;primes[i] <= log2;i++){
    root = Math.round(Math.pow(t,1/primes[i]));
    if(t - (Math.pow(root,primes[i])) == 0){
      if(arguments.length  > 0){
        nroot[0] = Math.round(root);
        nroot[1] = primes[i];
      }
      return true
    }
  }
  return false;
};
