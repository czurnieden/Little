// this is slow, avoid if possible
String.prototype.trimTailChars = function(c){
  var idx, len = this.length;
  var tmp = this;
  while(len--){
    idx = tmp.lastIndexOf(c);
    if(idx == -1) {
      break;
    }
    tmp = tmp.substring(0,idx);
  }
  return tmp;
};

String.prototype.trimTailChar = function(c){
  var idx, len = this.length;
  var tmp = this;
  while(len--){
     idx = tmp.charAt(len);
     if(idx != c){
       break;
     }
  }
  return tmp.substring(0,len + 1);
};

String.prototype.countTailChar = function(c){
  var idx, len = this.length;
  while(len--){
     idx = this.charAt(len);
     if(idx != c){
       break;
     }
  }
  return this.length-(len + 1);
}

// too complicated, not worth the hassle
//String.prototype.trimLeadChars = function(c){};

String.prototype.trimLeadChar = function(c){
  var idx, len = 0;
  var tmp = this;
  while(len++ < this.length){
     idx = tmp.charAt(len);
     if(idx != c){
       break;
     }
  }
  return tmp.substring(len,this.length-1);
};
