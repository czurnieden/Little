function parseNumericLiteral(literal) {
  if (literal.charAt(0) === "0") {
    switch(literal.charAt(1).toLowerCase()) {
      case "x":
        return parseNumber(literal.substr(2), 16);
        break;
      case "b":
        return parseNumber(literal.substr(2), 2);
        break;
      default:
       return parseNumber(literal.substr(1), 8);
      break;
    }
  } else {
    return parseNumber(literal,10);
  }
}

function parseImaginaryLiteral(literal) {
  return parseNumericLiteral(literal.
                    subst(0,literal.length-1));
}


function parseNumber(string, base){

  var sign,          has_sign, 
      integer_part,  has_integer_part,
      radix_part,    has_radix_part,
      fraction_part, has_fraction_part,
      exponent_mark, has_exponent_mark,
      exponent_sign, has_exponent_sign,
      exponent,      has_exponent,
      regex_array, regexp, the_number;

  if(arguments.length == 0){
    return Number.NaN;
  }
  if (typeof string !== "string"){
    return Number.NaN;
  }
  if (typeof base === "undefined"){
    base = 10;
  }
  /* shortcut for now to avoid rounding errors */
  if(base == 10 && (typeof Bigfloat === 'undefined') ){
    return parseFloat(string);
  }
  /* 
    These regular expressions are not complete (allow e.g.: "-.e")
   */
  switch(base){
    case 2:
      regexp = /([+-]{0,1})([01]*)([.]{0,1})([01]*)([eE]{0,1})([+-]{0,1})([0-9]*)/;
      break;
    case 8:
      regexp = /([+-]{0,1})([0-7]*)([.]{0,1})([0-7]*)([eE]{0,1})([+-]{0,1})([0-9]*)/;
      break;
    case 16:
      regexp = /([+-]{0,1})([0-9a-fA-F]*)([.]{0,1})([0-9a-fA-F]*)([pP]{0,1})([+-]{0,1})([0-9]*)/;
      break;
    default: /* base 10 */
      regexp = /([+-]{0,1})([0-9]*)([.]{0,1})([0-9]*)([eE]{0,1})([+-]{0,1})([0-9]*)/;
      break;
  }
  /*
     The Array consists of eight parts
     0 = parsed string (the whole match so to say). Not used
     1 = sign of mantissa if any
     2 = integer part if any
     3 = radix point if any
     4 = fractional part if any
     5 = exponent mark if any. [pP] for hexadecimal number, [eE] otherwise (IEEE-754)
     6 = exponent sign if any
     7 = exponent if any. The exponent is always a decimal integer (IEEE-754)
   */
  regex_array = regexp.exec(string);

  has_sign = (regex_array[1] !== 'undefined') ? true : false ;
      sign = (regex_array[1] === "-") ? -1 : 1;

  has_integer_part = (regex_array[2] !== 'undefined') ? true : false ;
      integer_part = (has_integer_part) ? regex_array[2] : 0 ;

  has_radix_part = (regex_array[3] !== 'undefined') ? true : false ;

  has_fraction_part = (regex_array[4] !== 'undefined') ? true : false ;
      fraction_part = (has_fraction_part) ? regex_array[4] : 0 ;

  has_exponent_mark = (regex_array[5] !== 'undefined') ? true : false ;

  has_exponent_sign = (regex_array[6] !== 'undefined') ? true : false ;
      exponent_sign = (regex_array[6] === "-") ? -1 : 1 ;

  has_exponent = (regex_array[7] !== 'undefined') ? true : false ;
      exponent = (has_exponent) ? regex_array[7] : 0 ;

  /* It needs  at least one digit anywhere. E.g.: "0." and ".0" are correct
     "." is not. */
  if(!has_integer_part && !has_fraction_part){
    return Number.NaN;
  }
  /* An exponent mark without an exponent is too lonely to be socially
     acceptable */
  if(has_exponent_mark && !has_exponent){
    return Number.NaN;
  }
  /* All ok and proper, we can make a whole number out of the parts now */
  var ipl = integer_part.length;
  var fpl = fraction_part.length;
  /* If the fractional part does not exist it is, to almost all intents and
     purposes, an integer */
  if(has_radix_part && (fpl != 0) ){ /* it is a float */
    /* we shift the radix point fpl-times to the right */
    if(ipl && fpl){
      integer_part = integer_part + fraction_part;
    } else if(!ipl && fpl){
      integer_part = fraction_part;
    }
    if(!has_exponent){
      has_exponent = true;
      exponent = "0";
    }
    /*update exponent, check for over/under-run*/
    exponent = parseInt(exponent);
    exponent *= exponent_sign;
    /* The exponent is always the exponent with the base being the mantissa
       and the exponent is always decimal, so this simple addition always
       holds */
    exponent -= fpl;
    /* Please adapt */
    if(exponent < -307){
      return Number.NEGATIVE_INFINITY;
    } 
    if(exponent > 308){
      return Number.POSITIVE_INFINITY;
    }
  } 
  /* it is an integer, either it was one or it has been made one */
  /* If we have Bigint: make integer and shift according to exponent if any,
     check for over/under-run */
   /*if(typeof Bigint !== 'undefined'){*/
    /* Will probably get handled in Bigint itself*/
  /*}*/
  /* If a radix point exists and there is a difference between an integer and
    a float (e.g.: with big-numbers) act accordingly */
  /*else if(has_radix && (typeof Bigfloat !== 'undefined') ){*/
   /* Will probably get handled in Bigfloat itself*/
  /*}*/

  if(!has_exponent){
    has_exponent = true;
    exponent = "0";
  }

  /* ECMAScript is not fully IEEE-754 compliant for bases other than 10 */
  integer_part = parseInt(integer_part,base);
  exponent     = parseInt(exponent,10);
  exponent    *= sign;
  /* integer_part is now a number, so just reshift it*/
  integer_part *= Math.pow(base,exponent);
  the_number = integer_part;
  the_number *= sign;

  return the_number;
}
