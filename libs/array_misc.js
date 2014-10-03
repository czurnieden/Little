Array.prototype.memset = function(val){
  for(var i = 0;i<this.length;i++){
    this[i] = val;
  }
};
// Polyfill from developer.mozilla.org
if (!Array.prototype.fill) {
  Array.prototype.fill = function(value) {
    if (this == null) {
      throw new TypeError("this is null or not defined");
    }
    var O = Object(this);
    var len = O.length >>> 0;
    var start = arguments[1];
    var relativeStart = start >> 0;
    var k = relativeStart < 0 ?
    Math.max(len + relativeStart, 0) :
    Math.min(relativeStart, len);
    var end = arguments[2];
    var relativeEnd = (end === undefined)?len : end >> 0;
    var final = (relativeEnd < 0) ? Math.max(len + relativeEnd, 0) :
                                    Math.min(relativeEnd, len);
    while (k < final) {
      O[k] = value;
      k++;
    }
    return O;
  };
}

Array.prototype.whichtype = function(){
  var rettype = undefined;
  for(var i=0;i<this.length;i++){
    if((typeof rettype) === 'undefined'){
      rettype = (typeof this[i]);
    }
    else{
      if(rettype !== (typeof this[i])){
        return undefined;
      }
    }
  }
  return rettype;
};

Array.prototype.xwhichtype = function(){
  var rettype = undefined;
  for(var i=0;i<this.length;i++){
    if((typeof rettype) === 'undefined'){
      rettype = xtypeof(this[i]);
    }
    else{
      if(rettype !== xtypeof(this[i])){
        return undefined;
      }
    }
  }
  return rettype;
};

Array.prototype.swap = function(i, j) {
  var temp = this[i];
  this[i] = this[j];
  this[j] = temp;
  return this;
};
/* min/max do not check for numericality! */
Array.prototype.max = function(){
  var max = undefined;

  for(var i=0;i<this.length;i++){
    if((typeof max === 'undefined') || (this[i]>max)){
      max = this[i];
    }
  }
  return max;
};
Array.prototype.min = function(){
  var min = undefined;

  for(var i=0;i<this.length;i++){
    if((typeof min == 'undefined') || (this[i]<min)){
      min = this[i];
    }
  }
  return min;
};

/*

I have this done but that function  is implemented natively now but in a slightly
 different version. Must check if this thing is used anywhere!

Array.prototype.forEach = function(f){
  if(typeof f != 'function') return undefined;
  for(var i=0;i<this.length;i++){
      this[i] = f(this[i]);
  }
  return this;
};
*/


Array.prototype.uniqOnCopy = function(){
  var l   = this.length;
  var ret = new Array();
  for(var i=0;i<l;i++){
    if( ret.indexOf( this[i], 0) < 0 ){
      ret.push(this[i]);
    }
  }
  return ret;
};


/* Yes, some of it is already in ECMAScript, must check for them and replace */
Array.prototype.walkOnCopy = function(f) {
 var l   = this.length;
 var ret = new Array(l);
 while(l--){
   ret[l] = f(this[l]);
 }
 return ret;
};
Array.prototype.walk = function(f) {
 var l   = this.length;
 while(l--){
   this[l] = f(this[l]);
 }
};
Array.prototype.insert = function(i,element){
 var l = this.length;
 var a = new Array();
 var b = new Array();

 if(i>=0 && i<l) {
  a = this.slice(0,i+1)
  b = this.slice(i+1);
  a.push(e);
  return a.concat(b);
 }
 if(i<0 && Math.abs(i)<l) {
  a = this.slice(0,i)
  b = this.slice(i);
  a.push(e);
  return a.concat(b);
 }
};

Array.prototype.bytesToNumber = function(min){
  var ret   = new Array();
  var bytes = 0;
  var l = this.length;

  if(!min || min<=0){return undefined}
  bytes = Math.ceil(Math.ceil(Math.log2(min))/8);
  if(l<=bytes){return undefined}
  for(var i=0;i<l;i += bytes){
    var temp = '0x';
    for(var j=0;j<bytes;j++){
      temp += (this[i+j])?this[i+j].toString(16):"00";
    }
    ret.push(parseInt(temp));
  }
  return ret;
};

Array.prototype.everyNth = function(n,f){
  var l = this.length;
  var a = new Array();
  if(  (typeof n) != 'number' 
     || n <= 0
     || l < n
     || !Math.isInteger(n)){
   return undefined
  }
  else{
    for(var i=n-1;i<l;i+=n){
      if(f && (typeof f) == 'function'){
        a.push(f(this[i]));
      }
      else{
        a.push(this[i]);
      }
    }
    return a;
  }
  return undefined;
};
Array.prototype.sum = function(f){
  var sum = 0;

  for(var i=0;i<this.length;i++){
    if(typeof f == 'function'){
      sum = sum.add(f(this[i]));
    }
    else{
      sum = sum.add(this[i]);
    }
  }
  return sum;
};
Array.prototype.cumsum = function(){
  var ret = new Array(this.length);
  
  if(this.length <= 1){
    ret = this
    return ret;
  }

  ret[0] = this[0];
  
  for(var i=1;i<this.length;i++){
    ret[i] = ret[i].add( ret[i-1].add(this[i]) );
  }
  return ret;
};
/* Some 2d functions */
Array.prototype.sumCol = function(n){
  var l   = this.length;
  var sum = 0.0;
  for(var i=0;i<l;i++){
    if((typeof this[i][n]) == 'number'){
      sum = sum.add(this[i][n]);
    }
  }
  return sum;
}
Array.prototype.sumRow = function(n){
  var l   = this[n].length;
  var sum = 0.0;
  for(var i=0;i<l;i++){
    if((typeof this[n][i]) == 'number'){
      sum = sum.add(this[n][i]);
    }
  }
  return sum;
};

Array.prototype.product = function(f){
  var prod = 1;

  for(var i=0;i<this.length;i++){
    if(typeof f == 'function'){
      prod = prod.mul(f(this[i]));
    }
    else{
      prod = prod.mul(this[i]);
    }
  }
  return prod;
};

Array.prototype.countSingle = function(s){
  var n = 0;
  for(var i = 0; i < this.length; i++){
    if(this[i] === s){
      n++;
    }
  }
  return n;
};
Array.prototype.countAll = function(){
  var temp = new Object();
  var ret  = new Array();
  var l    = this.length;
  var j    = 0;

  for(var i=0;i<l;i++){
    if((typeof temp[this[i]]) == 'undefined'){
      temp[this[i]] = j;
      ret[j]        = new Array(this[i],1);
      j++;
    }
    else{
      ret[temp[this[i]]][1] += 1;
    }
  }
  return ret;
};
Array.prototype.chisqSingle = function(df){
  var l        = this.length;
  var temp     = new Array(df+1);
  var arrtemp  = new Array();
  var expected = l/(df+1);
  var chisq    = 0.0;
  var a        = 0.0;

  temp.memset(0);
  
  arrtemp = this.countAll();
  if(arrtemp.length > (df+1)){return undefined}

  for(var i=0;i<arrtemp.length;i++){
    temp[arrtemp[i][0]] = arrtemp[i][1];
  }

  for(var i=0;i<(df+1);i++){
    a      = (temp[i]*1.0) - expected;
    chisq  = chisq + ((a*a)/expected);
  }
  return chisq;
};

Array.prototype.correlationCoefficient = function(y){
  if(typeof y != "undefined"){
    if(y.length != this.length){
      return undefined;
    }
    return this.coVariance(y)/(this.standardDev() * y.standardDev());
  }
  else{return this.correlationCoefficient(this)}
};


/**
 * Calculates the {@literal r<sup>2</sup>} of the array and the given second
 * sample.
 * If no second sample is given, it calculates the {@literal r<sup>2</sup>} with
 * itself. Both samples must be of the same length and type.
 * Does not rely on numerical elements but ignores them. Precautions should
 * be taken by the user (for example with {@code Array.xwhichtype}).
 * @author Christoph Zurnieden
 * @param y an array with the second sample
 * @return the {@literal r<sup>2</sup>}
 * @since 0.0.1
 * @version 0.0.1 
*/
Array.prototype.rsquare = function(y){
  return Math.pow(this.correlationCoefficient(y),2);
};
/**
 * Calculates the linear regression of the array and the given second
 * sample.
 * If no second sample is given, it calculates the linear regression with
 * itself. Both samples must be of the same length and type.
 * Does not rely on numerical elements but ignores them. Precautions should
 * be taken by the user (for example with {@code Array.xwhichtype}).
 * @author Christoph Zurnieden
 * @param y an array with the second sample
 * @return an array with the two values
 * @since 0.0.1
 * @version 0.0.1 
*/
Array.prototype.linearRegression = function(y){
  var tmean = this.arithMean();
  var ymean = 0.0;
  var sumxy = 0.0;
  var sumxx = 0.0;

  var a = 0.0;
  var b = 0.0;

  var ret   = new Array(2);
  
  if(xtypeof(y) == "array"){
    if(y.length != this.length){
      return undefined;
    }
    ymean = y.arithMean();
    for(var i=0;i< this.length;i++){
      sumxy += (this[i] - tmean)*(   y[i] - ymean);
      sumxx += (this[i] - tmean)*(this[i] - tmean);  
    }
    b = sumxy/sumxx;
    a = ymean - b*tmean;
    ret[0] = a;
    ret[1] = b;
    return ret;
  }
  else{return this.linearRegression(this)}
};

/**
 * Calculates the entropy of the elements in the array with given degrees of
 * freedom.
 * Does not rely on numerical elements but ignores them. Precautions should
 * be taken by the user (for example with {@code Array.xwhichtype}).
 * @author Christoph Zurnieden
 * @param df the degrees of freedom
 * @return the entropy
 * @since 0.0.1
 * @version 0.0.1 
*/
Array.prototype.entropy = function(df){
  var l       = this.length;
  var arr     = new Array(df+1); 
  var arrtemp = new Array();   
  var temp    = 0.0;
  var entropy = 0.0;
  
  arr.memset(0);

  arrtemp = this.countAll();
  for(var i=0;i<(arrtemp.length);i++){
    arr[arrtemp[i][0]] = arrtemp[i][1];
  }

  for(var i=0;i<(df+1);i++){
    temp = (arr[i] * 1.0)/(l * 1.0);
    if(temp > 0.0){
      entropy += temp * (Math.log2(1.0/temp));
    }
  }
  return entropy;
};

/********************************* Some combinatorics *************************/

/* Generate nCk combinations (Alg. by D. Knuth) */
Array.prototype.comb = function(k){
  var i;
  var r;
  var n = this.length;
  var a = new Array(n);
  var w = new Array(n+1);

  var ret = new Array();

  if(k>n || n <= 0 || k <= 0){return undefined;}

  r = n-k;

  for(i=0;i<r;i++){
    a[i] = 0;
    w[i] = 1;
  }
  for(i=r;i<n;i++){
    a[i] = 1;
    w[i] = 1;
  }

  w[n] = 1;
  while(true){
    var temp = new Array();
    for(i = n-1; i >= 0; i--){
      if(a[i] == 1){temp.push(this[i]);}
    }
    ret.push(temp);
    if(n==k){
      return ret;
    }

    for(i=r;w[i]==0;i++){
      w[i] = 1;
    }
    if(i == n){
      break;
    }
    w[i] = 0;

    if(a[i] != 0){
      a[i] = 0;
      if((i&1) || a[i-2] != 0){
        a[i-1] = 1;
        if(r == i-1){
          r = i;
        }
        else if(r == i && i > 1){
          r = i-1;
        }
      }
      else{
        a[i-2] = 1;
        if(r == i-2){
          r = i-1;
        }
        else if (r == i){
          if(i > 3){
            r = i-2;
          }
          else{
            r = 1;
          }
        }
      }
    }
    else{
      a[i] = 1;
      if((i&1) && a[i-1] == 0){
        a[i-2] = 0;
        if(r == i-2){
          r = i;
        }
        else if(r == i-1){
          r = i-2;
        }
      }
      else{
        a[i-1] = 0;
        if(r == i-1){
          r = i;
        }
        else if(r == i && i > 1){
          r = i-1;
        }
      }
    }
  }
  return ret;
};
/* Generate nPk permutation with n = k. Algorithm by Edsger Wybe Dijkstra*/
Array.prototype.perm = function(){
  var i, j, r, s, temp;
  var n = this.length;
  var ret  = new Array();
  var perm = new Array(n+1);

  for (i=0; i <= n; i++) perm[i] = i;

   i = 1;

   while(i){
     var temp = new Array();
     for(i=1;i<=n;i++){
       temp.push(this[perm[i]-1]);
     }
     ret.push(temp);

     for(i = n-1;perm[i]>perm[i+1];i--){;}
     for(j = n  ;perm[i]>perm[j]  ;j--){;}

     swp = perm[i];
     perm[i] = perm[j];
     perm[j] = swp;

     for(r = n,s = i+1;r > s;r--,s++){
       swp = perm[r];
       perm[r] = perm[s];
       perm[s] = swp;
     }
   }
   return ret;
};
/* Generate all subsets.
  Algorithm from "Combinatorial Algorithms: Theory and Praxis" by Edward Reingold,
  Jörg Nievergelt, and Narsingh Deo; Prentice-Hall, 1977 */
Array.prototype.subsets = function(){
  var i, j;
  var n = this.length;
  var g = new Array(n+2);
  var t = new Array(n+2);
  var ret = new Array();

  for(j=0;j<=n+1;j++){
    g[j] = false;
    t[j] = j+1;
  }
  i=0;
  while (i < n+1){
    var temp = new Array();
    for (j=0;j<=n;j++){
      if(g[j]){
        temp.push(this[j-1])
      }
    }
    ret.push(temp);

    i = t[0];
    g[i] = !g[i];
    t[0] = 1;
    t[i-1] = t[i];
    t[i] = i+1;
  }
  return ret;
};



















