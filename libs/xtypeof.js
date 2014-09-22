/*
  Generalization of ECMAScript's typeof operator
  Needs soem work before use, namely to add all the
  objects into the list which are not already defined
  by the engine. Two examples are given.
  Or comment everything between start and end out.
*/
function xtypeof(obj){
  // try it the traditional way
  var tmp = typeof obj;
  if( tmp !== "object"){
    return tmp;
  }
  else{
    // try the toString prototype
    var toString = Object.prototype.toString;
    tmp = toString.call(obj);
    // it is one of the build-ins
    if(tmp !== "[object Object]"){
      return tmp.slice(8, -1).toLowerCase();
    }
    else{
      //start
      // Put your own objects here
      // they must exist at this point
      var list = {
                  "someobject":someobject,
                  "someobjecttwo":someobjecttwo
                 };
      for(var p in list){
        if(obj instanceof list[p]){
          return p;
        }
      }
      //end
      return "object";
    }
  }
}
