/*
  Some functions for values on the real line
*/

*
  The following algorithms (until the line where it says that it ends) are ports
   from the Cephes files included in Grace 5.1.21, who have the permission to
   distribute it under the GPL. Original copyright of the Cephes Math Library
   Release 2.3: 1984, 1995 by Stephen L. Moshier.

   All of this functions are for the real line only for now, sorry.

*/

Math.polyEval = function(x,coeff, degree){
  var count = 0;
  var ind   = 0;
  var ret   = 0.0;
  if(isNaN(x) || degree < 0 || coeff.length < 1){return undefined;}
  if(x == 0){return 0}

  count = degree;
  ret = coeff[ind++];
  
  do{
    ret = ret * x  +  coeff[ind++];
  }while(--count);

  return ret;  
};

Math.polyOneEval = function(x,coeff, degree){
  var count = 0;
  var ind   = 0;
  var ret   = 0.0;
  if(isNaN(x) || degree < 0 || coeff.length < 1){return undefined;}
  if(x == 0){return 0}

  count = degree-1;
  ret = x + coeff[ind++];
  
  do{
    ret = ret * x  +  coeff[ind++];
  }while(--count);

  return ret;  
};
/* Bessel function of the first kind and of order zero */
Math.besselj0 = function(x){
 
  var PP = [
             7.96936729297347051624E-4,
             8.28352392107440799803E-2,
             1.23953371646414299388E0,
             5.44725003058768775090E0,
             8.74716500199817011941E0,
             5.30324038235394892183E0,
             9.99999999999999997821E-1
            ];
  var PQ = [
             9.24408810558863637013E-4,
             8.56288474354474431428E-2,
             1.25352743901058953537E0,
             5.47097740330417105182E0,
             8.76190883237069594232E0,
             5.30605288235394617618E0,
             1.00000000000000000218E0
            ];
  var QP = [
             -1.13663838898469149931E-2,
             -1.28252718670509318512E0,
             -1.95539544257735972385E1,
             -9.32060152123768231369E1,
             -1.77681167980488050595E2,
             -1.47077505154951170175E2,
             -5.14105326766599330220E1,
             -6.05014350600728481186E0
            ];
  var QQ = [
             /*  1.00000000000000000000E0,*/
             6.43178256118178023184E1,
             8.56430025976980587198E2,
             3.88240183605401609683E3,
             7.24046774195652478189E3,
             5.93072701187316984827E3,
             2.06209331660327847417E3,
             2.42005740240291393179E2,
            ];
  var DR1 = 5.783185962946784521175995758455807035071;
  var DR2 = 30.47126234366208639907816317502275584842;

  var RP = [
             -4.79443220978201773821E9,
              1.95617491946556577543E12,
             -2.49248344360967716204E14,
              9.70862251047306323952E15
            ];
  var RQ = [
             /* 1.00000000000000000000E0,*/
              4.99563147152651017219E2,
              1.73785401676374683123E5,
              4.84409658339962045305E7,
              1.11855537045356834862E10,
              2.11277520115489217587E12,
              3.10518229857422583814E14,
              3.18121955943204943306E16,
              1.71086294081043136091E18
            ];
  var w  = 0.0;
  var z  = 0.0;
  var p  = 0.0;
  var q  = 0.0;
  var xn = 0.0;

  if(x<0){x = -x;}
  if(x <= 5.0){
    z = x*x;
    if( x < 1.0e-5 ){return( 1.0 - z/4.0 );}
    p = (z - DR1*1.0) * (z - DR2*1.0);
    p = p * Math.polyEval(z,RP,3)/Math.polyOneEval(z,RQ,8);
    return p;
  }

  w = 5.0/x;
  q = 25.0/(x*x);
  p = Math.polyEval( q, PP, 6)/Math.polyEval( q, PQ, 6 );
  q = Math.polyEval( q, QP, 7)/Math.polyOneEval( q, QQ, 7 );
  xn = x - Math.PI_4;
  p = (p * Math.cos(xn)) - (w * q * Math.sin(xn));

  return (p * Math.sqrt(Math.TWO_PI)/Math.sqrt(x));

};

/* Bessel function of the first kind and of order one */
Math.besselj1 = function(x){
  var RP = [
             -8.99971225705559398224E8,
              4.52228297998194034323E11,
             -7.27494245221818276015E13,
              3.68295732863852883286E15
  ];
  var RQ = [
              /* 1.00000000000000000000E0,*/
              6.20836478118054335476E2,
              2.56987256757748830383E5,
              8.35146791431949253037E7,
              2.21511595479792499675E10,
              4.74914122079991414898E12,
              7.84369607876235854894E14,
              8.95222336184627338078E16,
              5.32278620332680085395E18, 
           ];
  var PP = [
             7.62125616208173112003E-4,
             7.31397056940917570436E-2,
             1.12719608129684925192E0,
             5.11207951146807644818E0,
             8.42404590141772420927E0,
             5.21451598682361504063E0,
             1.00000000000000000254E0
           ];
  var PQ = [
             5.71323128072548699714E-4,
             6.88455908754495404082E-2,
             1.10514232634061696926E0,
             5.07386386128601488557E0,
             8.39985554327604159757E0,
             5.20982848682361821619E0,
             9.99999999999999997461E-1
           ];
  var QP = [
             5.10862594750176621635E-2,
             4.98213872951233449420E0,
             7.58238284132545283818E1,
             3.66779609360150777800E2,
             7.10856304998926107277E2,
             5.97489612400613639965E2,
             2.11688757100572135698E2,
             2.52070205858023719784E1
           ];
  var QQ = [
             7.42373277035675149943E1,
             1.05644886038262816351E3,
             4.98641058337653607651E3,
             9.56231892404756170795E3,
             7.99704160447350683650E3,
             2.82619278517639096600E3,
             3.36093607810698293419E2
           ];
  var Z1 = 1.46819706421238932572E1;
  var Z2 = 4.92184563216946036703E1;

  var w  = 0.0;
  var z  = 0.0;
  var p  = 0.0;
  var q  = 0.0;
  var xn = 0.0;

  w=x;
  if(x<0){w=-x;}
  if(w<=5.0){
    z = x*x;
    w = Math.polyEval( z, RP, 3 ) / Math.polyOneEval( z, RQ, 8 ); 
    w = w * x * (z - Z1) * (z - Z2);
    return w;
  }

  w = 5.0/x;
  z = w * w;
  p = Math.polyEval( z, PP, 6)/Math.polyEval( z, PQ, 6 );
  q = Math.polyEval( z, QP, 7)/Math.polyOneEval( z, QQ, 7 );
  xn = x - (3*Math.PI_4);
  p = (p * Math.cos(xn)) - (w * q * Math.sin(xn));

  return( p * Math.sqrt(Math.TWO_PI) / sqrt(x) );
};

/* Bessel function of the second kind and of order one */
Math.bessely1 = function(x){
  var YP = [
             1.26320474790178026440E9,
            -6.47355876379160291031E11,
             1.14509511541823727583E14,
            -8.12770255501325109621E15,
             2.02439475713594898196E17,
            -7.78877196265950026825E17
           ];
  var YQ = [
            5.94301592346128195359E2,
            2.35564092943068577943E5,
            7.34811944459721705660E7,
            1.87601316108706159478E10,
            3.88231277496238566008E12,
            6.20557727146953693363E14,
            6.87141087355300489866E16,
            3.97270608116560655612E18
           ];
  var PP = [
             7.62125616208173112003E-4,
             7.31397056940917570436E-2,
             1.12719608129684925192E0,
             5.11207951146807644818E0,
             8.42404590141772420927E0,
             5.21451598682361504063E0,
             1.00000000000000000254E0
           ];
  var PQ = [
             5.71323128072548699714E-4,
             6.88455908754495404082E-2,
             1.10514232634061696926E0,
             5.07386386128601488557E0,
             8.39985554327604159757E0,
             5.20982848682361821619E0,
             9.99999999999999997461E-1
           ];
  var QP = [
             5.10862594750176621635E-2,
             4.98213872951233449420E0,
             7.58238284132545283818E1,
             3.66779609360150777800E2,
             7.10856304998926107277E2,
             5.97489612400613639965E2,
             2.11688757100572135698E2,
             2.52070205858023719784E1
           ];
  var QQ = [
             7.42373277035675149943E1,
             1.05644886038262816351E3,
             4.98641058337653607651E3,
             9.56231892404756170795E3,
             7.99704160447350683650E3,
             2.82619278517639096600E3,
             3.36093607810698293419E2
           ];
  var w  = 0.0;
  var z  = 0.0;
  var p  = 0.0;
  var q  = 0.0;
  var xn = 0.0;

  if(x<=5.0){
    if(x<=0){
      return undefined;
    }
    z = x*x;
    w = x * (Math.polyEval( z, YP, 5 ) / Math.polyOneEval( z, YQ, 8 ));
    w += Math.TWO_PI * (Math.besselj1(x) * Math.log(x)  -  1.0/x );
    return w;
  }

  w = 5.0/x;
  z = w * w;
  p = Math.polyEval( z, PP, 6)/Math.polyEval( z, PQ, 6 );
  q = Math.polyEval( z, QP, 7)/Math.polyOneEval( z, QQ, 7 );
  xn = x - (3*Math.PI_4);
  p = (p * Math.sin(xn)) + (w * q * Math.cos(xn));

  return( p * Math.sqrt(Math.TWO_PI) / sqrt(x) );  
};

/* Bessel function of the second kind and of order zero */
Math.bessely0 = function(x){
  var YP = [
             1.55924367855235737965E4,
             -1.46639295903971606143E7,
              5.43526477051876500413E9,
             -9.82136065717911466409E11,
              8.75906394395366999549E13,
             -3.46628303384729719441E15,
              4.42733268572569800351E16,
             -1.84950800436986690637E16
            ];
  var YQ = [
             /* 1.00000000000000000000E0,*/
              1.04128353664259848412E3,
              6.26107330137134956842E5,
              2.68919633393814121987E8,
              8.64002487103935000337E10,
              2.02979612750105546709E13,
              3.17157752842975028269E15,
              2.50596256172653059228E17
            ];

  var PP = [
             7.96936729297347051624E-4,
             8.28352392107440799803E-2,
             1.23953371646414299388E0,
             5.44725003058768775090E0,
             8.74716500199817011941E0,
             5.30324038235394892183E0,
             9.99999999999999997821E-1
            ];
  var PQ = [
             9.24408810558863637013E-4,
             8.56288474354474431428E-2,
             1.25352743901058953537E0,
             5.47097740330417105182E0,
             8.76190883237069594232E0,
             5.30605288235394617618E0,
             1.00000000000000000218E0
            ];
  var QP = [
             -1.13663838898469149931E-2,
             -1.28252718670509318512E0,
             -1.95539544257735972385E1,
             -9.32060152123768231369E1,
             -1.77681167980488050595E2,
             -1.47077505154951170175E2,
             -5.14105326766599330220E1,
             -6.05014350600728481186E0
            ];

  var QQ = [
             /*  1.00000000000000000000E0,*/
             6.43178256118178023184E1,
             8.56430025976980587198E2,
             3.88240183605401609683E3,
             7.24046774195652478189E3,
             5.93072701187316984827E3,
             2.06209331660327847417E3,
             2.42005740240291393179E2,
            ];
  var w  = 0.0;
  var z  = 0.0;
  var p  = 0.0;
  var q  = 0.0;
  var xn = 0.0;

  if(x<=5){
    if(x<=0.0){return undefined;}
    z  = x*x;
    w  = Math.polyEval( z, YP, 7) / Math.polyOneEval( z, YQ, 7 );
    w += Math.TWO_PI * Math.log(x) * Math.besselj0(x);
    return w;
  }
  w = 5.0/x;
  q = 25.0/(x*x);
  p = Math.polyEval( q, PP, 6)/Math.polyEval( q, PQ, 6 );
  q = Math.polyEval( q, QP, 7)/Math.polyOneEval( q, QQ, 7 );
  xn = x - Math.PI_4;  
  p = (p * Math.sin(xn)) + (w * q * Math.cos(xn));

  return (p * Math.sqrt(Math.TWO_PI)/Math.sqrt(x));
}

/* Bessel function of the first kind and of order n */
Math.besseljn = function(n,x){
  var pkm2 = 0.0;
  var pkm1 = 0.0;
  var pk   = 0.0;
  var xk   = 0.0;
  var r    = 0.0;
  var ret  = 0.0;
  
  var k    = 0;
  var sign = 0;
  
  if(!Math.isInteger(n)){return undefined;}
  
  if(n<0){
    n = -n;
    if((n&1)==0){sign = 1;}
    else{sign = -1;}
  }
  else{
    sign = 1;
  }
  if(x<0){
    if(n&1){sign = -sign;}
    x = -x;
  }
  if(n == 0){return ( sign * Math.besselj0(x))};
  if(n == 1){return ( sign * Math.besselj1(x))};
  if(n == 2){
    return (sign * (2.0 * Math.besselj1(x)/x  -  Math.besselj0(x)) );
  }
  if(x<Math.EPSILON){return 0.0;}
  
  k   = 53;
  pk  = 2 * (n + k);
  ret = pk;
  xk  = x * x;

  do{
     pk -= 2.0;
     ret = pk - (xk/ret);
  }while( --k > 0 );

  ret = x/ret;

  pk = 1.0;
  pkm1 = 1.0/ret;
  k = n-1;
  r = 2 * k;

  do{
     pkm2 = ((pkm1 * r)  -  (pk * x)) / x;
     pk = pkm1;
     pkm1 = pkm2;
     r -= 2.0;
  }while( --k > 0 ); 

  if(Math.abs(pk) > Math.abs(pkm1)){
    ret = Math.besselj1(x)/pk;
  }
  else{
    ret = Math.besselj0(x)/pkm1;
  }

  return( sign * ret );
};

/*  Bessel function of the second kind and of order n */
Math.besselyn = function(n,x){
  var ret  = 0.0;
  var anm1 = 0.0;
  var anm2 = 0.0;
  var r    = 0.0;

  var k    = 0;
  var sign = 0;

  if(!Math.isInteger(n)){return undefined;}
  
  if(n<0){
    n = -n;
    if((n&1)==0){sign = 1;}
    else{sign = -1;}
  }
  else{
    sign = 1;
  }

  if(n == 0){ return( sign * Math.bessely0(x) )};
  if(n == 1){ return( sign * Math.bessely1(x) )};

  if(x <= 0.0){return undefined;}

  anm2 = Math.bessely0(x);
  anm1 = Math.bessely1(x);
  k = 1;
  r = 2 * k;

  do{
      ret = r * anm1 / x  -  anm2;
      anm2 = anm1;
      anm1 = ret;
      r += 2.0;
      ++k;
  }while( k < n );

  return( sign * ret);
};

/* modified Bessel function of the first kind and of order zero */
Math.besseli0 = function(x){
  var A = [
                        
            -4.41534164647933937950E-18,
             3.33079451882223809783E-17,
            -2.43127984654795469359E-16,
             1.71539128555513303061E-15,
            -1.16853328779934516808E-14,
             7.67618549860493561688E-14,
            -4.85644678311192946090E-13,
             2.95505266312963983461E-12,
            -1.72682629144155570723E-11,
             9.67580903537323691224E-11,
            -5.18979560163526290666E-10,
             2.65982372468238665035E-9,
            -1.30002500998624804212E-8,
             6.04699502254191894932E-8,
            -2.67079385394061173391E-7,
             1.11738753912010371815E-6,
            -4.41673835845875056359E-6,
             1.64484480707288970893E-5,
            -5.75419501008210370398E-5,
             1.88502885095841655729E-4,
            -5.76375574538582365885E-4,
             1.63947561694133579842E-3,
            -4.32430999505057594430E-3,
             1.05464603945949983183E-2,
            -2.37374148058994688156E-2,
             4.93052842396707084878E-2,
            -9.49010970480476444210E-2,
             1.71620901522208775349E-1,
            -3.04682672343198398683E-1,
             6.76795274409476084995E-1
          ];
  var B = [
            -7.23318048787475395456E-18,
            -4.83050448594418207126E-18,
             4.46562142029675999901E-17,
             3.46122286769746109310E-17,
            -2.82762398051658348494E-16,
            -3.42548561967721913462E-16,
             1.77256013305652638360E-15,
             3.81168066935262242075E-15,
            -9.55484669882830764870E-15,
            -4.15056934728722208663E-14,
             1.54008621752140982691E-14,
             3.85277838274214270114E-13,
             7.18012445138366623367E-13,
            -1.79417853150680611778E-12,
            -1.32158118404477131188E-11,
            -3.14991652796324136454E-11,
             1.18891471078464383424E-11,
             4.94060238822496958910E-10,
             3.39623202570838634515E-9,
             2.26666899049817806459E-8,
             2.04891858946906374183E-7,
             2.89137052083475648297E-6,
             6.88975834691682398426E-5,
             3.36911647825569408990E-3,
             8.04490411014108831608E-1
          ];
  if(x<0){x=-x}
  if(x<=8.0){
    y = (x/2.0) - 2.0;
    return( Math.exp(x) * Math.chbevl( y, A, 30 ) );
  }
  return(  Math.exp(x) * Math.chbevl( 32.0/x - 2.0, B, 25 ) / Math.sqrt(x) );
};

/* modified Bessel function of the first kind and of order one */
Math.besseli1 = function(x){
  var A = [
             2.77791411276104639959E-18,
            -2.11142121435816608115E-17,
             1.55363195773620046921E-16,
            -1.10559694773538630805E-15,
             7.60068429473540693410E-15,
            -5.04218550472791168711E-14,
             3.22379336594557470981E-13,
            -1.98397439776494371520E-12,
             1.17361862988909016308E-11,
            -6.66348972350202774223E-11,
             3.62559028155211703701E-10,
            -1.88724975172282928790E-9,
             9.38153738649577178388E-9,
            -4.44505912879632808065E-8,
             2.00329475355213526229E-7,
            -8.56872026469545474066E-7,
             3.47025130813767847674E-6,
            -1.32731636560394358279E-5,
             4.78156510755005422638E-5,
            -1.61760815825896745588E-4,
             5.12285956168575772895E-4,
            -1.51357245063125314899E-3,
             4.15642294431288815669E-3,  
            -1.05640848946261981558E-2,
             2.47264490306265168283E-2,
            -5.29459812080949914269E-2,
             1.02643658689847095384E-1,
            -1.76416518357834055153E-1,
             2.52587186443633654823E-1
          ];
  var B = [
             7.51729631084210481353E-18,
             4.41434832307170791151E-18,
            -4.65030536848935832153E-17,
            -3.20952592199342395980E-17,
             2.96262899764595013876E-16,
             3.30820231092092828324E-16,
            -1.88035477551078244854E-15,
            -3.81440307243700780478E-15,
             1.04202769841288027642E-14,
             4.27244001671195135429E-14,
            -2.10154184277266431302E-14,
            -4.08355111109219731823E-13,
            -7.19855177624590851209E-13,
             2.03562854414708950722E-12,
             1.41258074366137813316E-11,
             3.25260358301548823856E-11,
            -1.89749581235054123450E-11,
            -5.58974346219658380687E-10,
            -3.83538038596423702205E-9,
            -2.63146884688951950684E-8,
            -2.51223623787020892529E-7,
            -3.88256480887769039346E-6,
            -1.10588938762623716291E-4,
            -9.76109749136146840777E-3,
             7.78576235018280120474E-1
          ];
  var y = 0.0
  var z = 0.0;

  z = Math.abs(x);
  if( z <= 8.0 ){
    y = (z/2.0) - 2.0;
    z = Math.chbevl( y, A, 29 ) * z * Math.exp(z);
  }
  else{
    z = Math.exp(z) * Math.chbevl( 32.0/z - 2.0, B, 25 ) / Math.sqrt(z);
  }
  if( x < 0.0 ){z = -z;}

  return( z )
};

/* modified Bessel function of the third kind and of order zero */
Math.besselk0 = function(x){
  var A = [
             1.37446543561352307156E-16,
             4.25981614279661018399E-14,
             1.03496952576338420167E-11,
             1.90451637722020886025E-9,
             2.53479107902614945675E-7,
             2.28621210311945178607E-5,
             1.26461541144692592338E-3,
             3.59799365153615016266E-2,
             3.44289899924628486886E-1,
            -5.35327393233902768720E-1
          ];
var B = [
             5.30043377268626276149E-18,
            -1.64758043015242134646E-17,
             5.21039150503902756861E-17,
            -1.67823109680541210385E-16,
             5.51205597852431940784E-16,
            -1.84859337734377901440E-15,
             6.34007647740507060557E-15,
            -2.22751332699166985548E-14,
             8.03289077536357521100E-14,
            -2.98009692317273043925E-13,
             1.14034058820847496303E-12,
            -4.51459788337394416547E-12,
             1.85594911495471785253E-11,
            -7.95748924447710747776E-11,
             3.57739728140030116597E-10,
            -1.69753450938905987466E-9,
             8.57403401741422608519E-9,
            -4.66048989768794782956E-8,
             2.76681363944501510342E-7,
            -1.83175552271911948767E-6,
             1.39498137188764993662E-5,
            -1.28495495816278026384E-4,
             1.56988388573005337491E-3,
            -3.14481013119645005427E-2,
             2.44030308206595545468E0
        ];
  var y = 0.0;
  var z = 0.0
  if(x<=0){return undefined;}

  if(x<=2){
    y = x * x - 2.0;
    y = Math.chbevl( y, A, 10 ) - Math.log( 0.5 * x ) * Math.besseli0(x);
    return( y )   
  }

  z = 8.0/x - 2.0;
  y = Math.exp(-x) * Math.chbevl( z, B, 25 ) / Math.sqrt(x);

  return(y);
};

/* modified Bessel function of the third kind and of order one */
Math.besselk1 = function(x){
  var A = [
            -7.02386347938628759343E-18,
            -2.42744985051936593393E-15,
            -6.66690169419932900609E-13,
            -1.41148839263352776110E-10,
            -2.21338763073472585583E-8,
            -2.43340614156596823496E-6,
            -1.73028895751305206302E-4,
            -6.97572385963986435018E-3,
            -1.22611180822657148235E-1,
            -3.53155960776544875667E-1,
             1.52530022733894777053E0
          ];
  var B = [
            -5.75674448366501715755E-18,
             1.79405087314755922667E-17,
            -5.68946255844285935196E-17,
             1.83809354436663880070E-16,
            -6.05704724837331885336E-16,
             2.03870316562433424052E-15,
            -7.01983709041831346144E-15,
             2.47715442448130437068E-14,
            -8.97670518232499435011E-14,
             3.34841966607842919884E-13,
            -1.28917396095102890680E-12,
             5.13963967348173025100E-12,
            -2.12996783842756842877E-11,
             9.21831518760500529508E-11,
            -4.19035475934189648750E-10,
             2.01504975519703286596E-9,
            -1.03457624656780970260E-8,
             5.74108412545004946722E-8,
            -3.50196060308781257119E-7,
             2.40648494783721712015E-6,
            -1.93619797416608296024E-5,
             1.95215518471351631108E-4,
            -2.85781685962277938680E-3,
             1.03923736576817238437E-1,
             2.72062619048444266945E0
          ];

  var y = 0.0;
  var z = 0.0;
  
  z = 0.5 * x;
  if(z<=0){return undefined;}

  if(z<=2.0){
    y = x * x - 2.0;
    y =  Math.log(z) * Math.besseli1(x)  +  Math.chbevl( y, A, 11 ) / x;
    return y ;
  }

  return(Math.exp(-x) * Math.chbevl( 8.0/x - 2.0, B, 25 ) / Math.sqrt(x) );
};

/* modified Bessel function of the second kind and of noninteger order */
Math.besseliv = function(v,x){
  var sign = 0;

  var t    = 0.0;
  var ax   = 0.0;

  t = Math.floor(v);
  if(v<0){
    if(t == v){
      v = -v;
      t = -t;
    }
  }
  sign = 1;
  if(x<0){
    if(t!=v){return undefined;}
    if(v!=(2.0 * Math.floor(v/2.0))){
      sign = -1
    }
  }
  if(x==0){
    if(v==0){return 1.0;}
    if(v<0){return undefined;}
    else{return 0.0;}
  }

  ax = Math.abs(x);
  t = v * Math.log( 0.5 * ax )  -  x;
  t = sign * Math.exp(t) / Math.gamma( v + 1.0 );
  ax = v + 0.5;

  return( t * Math.hyperg( ax,  2.0 * ax,  2.0 * x ) );
};

/* modified Bessel function of the third kind and of order n */
Math.besselkn = function(nn,x){
  var k    = 0.0;
  var kf   = 0.0;
  var nk1f = 0.0;
  var nkf  = 0.0;
  var zn   = 0.0;
  var t    = 0.0;
  var s    = 0.0
  var z0   = 0.0;
  var z    = 0.0;;
  var ans  = 0.0;
  var fn   = 0.0;
  var pn   = 0.0;
  var pk   = 0.0;
  var zmn  = 0.0;
  var tlg  = 0.0;
  var tox  = 0.0;

  var i = 0;
  var n = 0;
  
  var MAXFAC = 31;
  var MAXLOG = Math.log(Number.MAX_VALUE);

  var asymp = function(){
      if( x > MAXLOG ){return undefined;}  // underflow
      k = n;
      pn = 4.0 * k * k;
      pk = 1.0;
      z0 = 8.0 * x;
      fn = 1.0;
      t = 1.0;
      s = t;
      nkf = Number.MAX_VALUE;
      i = 0;
      do{
        z = pn - pk * pk;
        t = t * z /(fn * z0);
        nk1f = Math.abs(t);
        if( (i >= n) && (nk1f > nkf) ){
           ans = Math.exp(-x) * Math.sqrt( Math.PI/(2.0*x) ) * s;
           return(ans);
        }
        nkf = nk1f;
        s += t;
        fn += 1.0;
        pk += 2.0;
        i += 1;
        }while( Math.abs(t/s) > Math.EPSILON );
        
        ans = Math.exp(-x) * Math.sqrt( Math.PI/(2.0*x) ) * s;
        return(ans);
  };
  if(nn<0){n = -nn;}
  else{n = nn;}

  if( n > MAXFAC ){return undefined;} // overflow
  if( x <= 0.0 ){return undefined;}//EDOM

  if( x > 9.55 ){return asymp();}


  ans = 0.0;
  z0  = 0.25 * x * x;
  fn  = 1.0;
  pn  = 0.0;
  zmn = 1.0;
  tox = 2.0/x;

  if( n > 0 ){
    /* compute factorial of n and psi(n) */
    pn = -Math.EM;
    k = 1.0;
    for( i=1; i<n; i++ ){
      pn += 1.0/k;
      k += 1.0;
      fn *= k;
    }
    zmn = tox;

    if( n == 1 ){ans = 1.0/x;}
    else{
      nk1f = fn/n;
      kf = 1.0;
      s = nk1f;
      z = -z0;
      zn = 1.0;
      for( i=1; i<n; i++ ){
        nk1f = nk1f/(n-i);
        kf = kf * i;
        zn *= z;
        t = nk1f * zn / kf;
        s += t;   
        if( (Number.MAX_VALUE - Math.abs(t)) < Math.abs(s) ){
          return undefined; // overflow
        }
        if( (tox > 1.0) && ((Number.MAX_VALUE/tox) < zmn) ){
          return undefined; // overflow
        }
        zmn *= tox;
      }
      s *= 0.5;
      t = Math.abs(s);
      if( (zmn > 1.0) && ((Number.MAX_VALUE/zmn) < t) ){return undefined;}
      if( (t > 1.0) && ((Number.MAX_VALUE/t) < zmn) ){return undefined;}
      ans = s * zmn;
    }
  }
  tlg = 2.0 * Math.log( 0.5 * x );
  pk = -Math.EM;
  if( n == 0 ){
    pn = pk;
    t = 1.0;
  }
  else{
    pn = pn + 1.0/n;
    t = 1.0/fn;
  }
  s = (pk+pn-tlg)*t;
  k = 1.0;

  do{
    t *= z0 / (k * (k+n));
    pk += 1.0/k;
    pn += 1.0/(k+n);
    s += (pk+pn-tlg)*t;
    k += 1.0;
  }while( Math.abs(t/s) > Math.EPSILON );

  s = 0.5 * s / zmn;
  if( n & 1 ){s = -s;}
  ans += s;

  return(ans);
};

/* confluent hypergeometric function */
Math.hyperg = function(a,b,x){
  var asum  = 0.0;
  var psum  = 0.0;
  var acanc = 0.0;
  var pcanc = 0.0;
  var temp  = 0.0;

  var hy1f1p = function(a,b,x){
      var n     = 1.0;
      var a0    = 1.0;
      var sum   = 1.0;
      var t     = 1.0;
      var u     = 0.0;
      var temp  = 0.0;
      var an    = a;
      var bn    = b;
      var maxt  = 0.0;
      var error = 0.0;

      while(t > Math.EPSILON){
        if(bn==0){return undefined;}
        if(an==0){return sum;}
        if(n>200){
          t = Math.abs(sum);
          //if( sum != 0.0 )
          //   maxt /= fabs(sum); No, that's too short
          if((t > 1.0) && (maxt > t)){
            pcanc = error;
            return sum;
          }
          if(t!=0){
            maxt /= t;
          }
          maxt *= Math.EPSILON;
          pcanc = Math.abs(Math.EPSILON * n  +  maxt );
          return sum;
        }
        u = x*(an / (bn * n));
        temp = Math.abs(u);
        if((temp > 1.0)&&(maxt>(Number.MAX_VALUE/temp))){
          error = 1.0;    /* estimate 100% error */
          pcanc = error;
          return sum;
        }
        
        a0 *= u;
        sum += a0;
        t = Math.abs(a0);
        if(t>maxt){maxt = t;}

        an += 1.0;
        bn += 1.0;
        n += 1.0;
      }
      t = Math.abs(sum);
      if((t > 1.0) && (maxt > t)){
        pcanc = error;
        return sum;
      }
      if(t!=0){
            maxt /= t;
      }
      maxt *= Math.EPSILON;
      pcanc = Math.abs(Math.EPSILON * n  +  maxt );
      return sum;
  };
  var err1  = 0.0;
  var err2  = 0.0;  
  var hy1f1a = function(a,b,x){
      var h1    = 0.0;
      var h2    = 0.0;
      var t     = 0.0;
      var u     = 0.0;
      var temp  = 0.0;
      var error = 0.0;
      var asum  = 0.0;
    
      if(x == 0){
        error = 1.0;
        asum = Number.MAX_VALUE;
        acanc = error;
        return asum;
      }
      temp = Math.log(Math.abs(x));
      t = x + temp * (a-b);
      u = -temp * a;
      if( b > 0 ){
        temp = Math.logGamma(b);
        t += temp;
        u += temp;
      }

      h1 = hyp2f0( a, a-b+1, -1.0/x, 1,1 );

      temp = Math.exp(u) / Math.gamma(b-a);
      h1 *= temp;
      err1 *= temp;

      h2 = hyp2f0( b-a, 1.0-a, 1.0/x, 2,2 );
      
      if( a < 0 ){temp = Math.exp(t) / Math.gamma(a);}
      else{temp = Math.exp( t - Math.logGamma(a) );}

      h2 *= temp;
      err2 *= temp;

      if(x < 0.0){asum = h1;}
      else{asum = h2;}

      error = Math.abs(err1) + Math.abs(err2);
      if(b < 0){
        temp = Math.gamma(b);
        asum *= temp;
        error *= Math.abs(temp);
      }
      if(asum != 0.0){error /= Math.abs(asum);}
      error *= 30.0;

      acanc = error;
      return asum;
  var hyp2f0 = function(a,b,x,type,err){
     var a0    = 0.0;
     var alast = 0.0;
     var t     = 0.0;
     var tlast = 0.0;
     var maxt  = 0.0;
     var n     = 0.0;
     var an    = 0.0;
     var bn    = 0.0;
     var u     = 0.0;
     var sum   = 0.0;
     var temp  = 0.0;

     an = a;
     bn = b;
     a0 = 1.0e0;
     alast = 1.0e0;
     sum = 0.0;
     n = 1.0e0;
     t = 1.0e0;
     tlast = 1.0e9;
     maxt = 0.0;

     do{
          if( an == 0 ){
                //goto pdone;
                /* estimate error due to roundoff and cancellation */
                if(err == 1){
                  err1 = Math.abs(  Math.EPSILON * (n + maxt)  );
                }
                if(err == 2){
                  err2 = Math.abs(  Math.EPSILON * (n + maxt)  );
                }

                alast = a0;
                //goto done;
                {
                  sum += alast;
                  return( sum );
                  /* series blew up: */
                  //error:
                  if(err == 1){
                     err1 = Number.MAX_VALUE;
                  }
                  if(err == 2){
                    err2 = Number.MAX_VALUE;
                  }
                  //mtherr( "hyperg", TLOSS );
                  return( sum );
                 }
           }
          
          if( bn == 0 ){
                //goto pdone;
                /* estimate error due to roundoff and cancellation */
                if(err == 1){
                  err1 = Math.abs(  Math.EPSILON * (n + maxt)  );
                }
                if(err == 2){
                  err2 = Math.abs(  Math.EPSILON * (n + maxt)  );
                }

                alast = a0;
                //goto done;
                {
                  sum += alast;
                  return( sum );
                  /* series blew up: */
                  //error:
                  if(err == 1){
                     err1 = Number.MAX_VALUE;
                  }
                  if(err == 2){
                    err2 = Number.MAX_VALUE;
                  }
                  //mtherr( "hyperg", TLOSS );
                  return( sum );
                 }
          }
          u = an * (bn * x / n);

          /* check for blowup */
          temp = Math.abs(u);
          if( (temp > 1.0 ) && (maxt > (Number.MAX_VALUE/temp)) ){
             //goto error;
             if(err == 1){
               err1 = Number.MAX_VALUE;
             }
             if(err == 2){
               err2 = Number.MAX_VALUE;
             }
             //mtherr( "hyperg", TLOSS );
             return( sum );
          }
          a0 *= u;
          t = Math.abs(a0);

          /* terminating condition for asymptotic series */
          if( t > tlast ){
             //goto ndone;
             /* The following "Converging factors" are supposed to improve accuracy,
              * but do not actually seem to accomplish very much. */
             n -= 1.0;
             x = 1.0/x;
             switch(type){  /* "type" given as subroutine argument */
               case 1: alast *= ( 0.5 + (0.125 + 0.25*b - 0.5*a + 0.25*x - 0.25*n)/x );
                       break;
               case 2: alast *= 2.0/3.0 - b + 2.0*a + x - n;
                       break;
               default:;
             }
             /* estimate error due to roundoff, cancellation, and nonconvergence */
             if(err == 1){
               err1 = Math.EPSILON* (n + maxt)  +  Math.abs ( a0 );
             }
             if(err == 2){
                err2 = Math.EPSILON* (n + maxt)  +  Math.abs ( a0 );
             }
             //done:
             sum += alast;
             return( sum );
          }
          tlast = t;
          sum += alast;   /* the sum is one term behind */
          alast = a0;

          if( n > 200 ){
            //goto ndone;
            /* The following "Converging factors" are supposed to improve accuracy,
             * but do not actually seem to accomplish very much. */
            n -= 1.0;
            x = 1.0/x;
            switch(type){  /* "type" given as subroutine argument */
              case 1: alast *= ( 0.5 + (0.125 + 0.25*b - 0.5*a + 0.25*x - 0.25*n)/x );
                       break;
              case 2: alast *= 2.0/3.0 - b + 2.0*a + x - n;
                      break;
              default:;
            }
            /* estimate error due to roundoff, cancellation, and nonconvergence */
            if(err == 1){
              err1 = Math.EPSILON* (n + maxt)  +  Math.abs ( a0 );
            }
            if(err == 2){
              err2 = Math.EPSILON* (n + maxt)  +  Math.abs ( a0 );
            }
            //done:
            sum += alast;
            return( sum );
          }
          an += 1.0e0;
          bn += 1.0e0;
          n += 1.0e0;
          if(t > maxt){maxt = t;}
        }while( t > Math.EPSILON )

         //pdone:  /* series converged! */    
        /* estimate error due to roundoff and cancellation */
        if(err == 1){
          err1 = Math.abs(  Math.EPSILON * (n + maxt)  );
        }
        if(err == 2){
          err2 = Math.abs(  Math.EPSILON * (n + maxt)  );
        }

        alast = a0;
        //goto done;
        {
          sum += alast;
          return( sum );
          /* series blew up: */
          //error:
          if(err == 1){
            err1 = Number.MAX_VALUE;
          }
          if(err == 2){
            err2 = Number.MAX_VALUE;
          }
          //mtherr( "hyperg", TLOSS );
          return( sum );
        }
        //ndone:  /* series did not converge */

        /* The following "Converging factors" are supposed to improve accuracy,
         * but do not actually seem to accomplish very much. */
        n -= 1.0;
        x = 1.0/x;
        switch(type){  /* "type" given as subroutine argument */
          case 1: alast *= ( 0.5 + (0.125 + 0.25*b - 0.5*a + 0.25*x - 0.25*n)/x );
                   break;
          case 2: alast *= 2.0/3.0 - b + 2.0*a + x - n;
                  break;
          default:;
        }

        /* estimate error due to roundoff, cancellation, and nonconvergence */
        if(err == 1){
          err1 = Math.EPSILON* (n + maxt)  +  Math.abs ( a0 );
        }
        if(err == 2){
          err2 = Math.EPSILON* (n + maxt)  +  Math.abs ( a0 );
        }
        //done:
        sum += alast;
        return( sum );
        /* series blew up: */
        //error:
  }

  temp = b - a;
  if(Math.abs(temp) < 0.001 * Math.abs(a) ){
    return(Math.exp(x) * Math.hyperg( temp, b, -x )  );
  }

  psum = hy1f1p( a, b, x);

  if(pcanc < 1.0e-15){
    if(pcanc > 1.0e-12){return undefined;} // loss of precision
    return psum;
  }
  
  asum = hy1f1a( a, b, x);
  if(acanc<pcanc){
    pcanc = acanc;
    psum = asum;
  }
  if( pcanc > 1.0e-12 ){return undefined;} // loss of precision

  return psum;
};

/* Evaluate Chebychev series. The argument "n" is the number of the coefficients! */
Math.chbevl = function(x, coeff,n){
  var b0 = 0.0;
  var b1 = 0.0;
  var b2 = 0.0;

  var p = 0;
  var i = 0;

  b0 = coeff[p++];
  b1 = 0.0;
  i = n - 1;

  do{
     b2 = b1;
     b1 = b0;
     b0 = x * b1  -  b2  + coeff[p++];
  }while( --i ); 
  
  return ( 0.5*(b0-b2) );
};

/* Hurwitz Zeta function, the Rieman zeta function with two arguments */
Math.zetaHur = function(x,q){
  var A = [
            12.0,
           -720.0,
           30240.0,
           -1209600.0,
           47900160.0,
           -1.8924375803183791606e9,
           7.47242496e10,
           -2.950130727918164224e12,
           1.1646782814350067249e14,
           -4.5979787224074726105e15,
           1.8152105401943546773e17,
           -7.1661652561756670113e18
          ];

  var a = 0.0;
  var b = 0.0;
  var k = 0.0;
  var s = 0.0;
  var t = 0.0;
  var w = 0.0;
  
  var i = 0;

  if( x == 1.0 ){
    //goto retinf;
    return undefined;// EDOM
  }

  if( x < 1.0 ){
    //domerr:
    return undefined; // EDOM
  }

  if( q <= 0.0 ){
    if(q == Math.floor(q)){
      //retinf:
      return undefined;// EDOM
    }
    if( x != Math.floor(x) ){
      return undefined /* EDOM because q^-x not defined */
    }
  }
  s = Math.pow( q, -x );
  a = q;
  i = 0;
  b = 0.0;
  while( (i < 9) || (a <= 9.0) ){
    i += 1;
    a += 1.0;
    b = Math.pow( a, -x );
    s += b;
    if( Math.abs(b/s) < Math.EPSILON ){
      //goto done;
      return s;
    }
  }
  w = a;
  s += b*w/(x-1.0);
  s -= 0.5 * b;
  a = 1.0;
  k = 0.0;
  for( i=0; i<12; i++ ){
    a *= x + k;
    b /= w;
    t = a*b/A[i];
    s = s + t;
    t = Math.abs(t/s);
    if( t < Math.EPSILON ){
      //goto done;
      return s;
    }
    k += 1.0;
    a *= x + k;
    b /= w;
    k += 1.0;
  }
  return(s);
};

/* Riemann (zeta()-1) on the real line  */
/* This function is related to the Rieman zeta function by
  zeta(x) = zetaRieC(x) + 1 */
Math.zetaRieC = function(x){
  var azetac = [
                 -1.50000000000000000000E0,
                 Number.POSITIVE_INFINITY,
                 6.44934066848226436472E-1,
                 2.02056903159594285400E-1,
                 8.23232337111381915160E-2,
                 3.69277551433699263314E-2,
                 1.73430619844491397145E-2,
                 8.34927738192282683980E-3,
                 4.07735619794433937869E-3,
                 2.00839282608221441785E-3,
                 9.94575127818085337146E-4,
                 4.94188604119464558702E-4,
                 2.46086553308048298638E-4,
                 1.22713347578489146752E-4,
                 6.12481350587048292585E-5,
                 3.05882363070204935517E-5,
                 1.52822594086518717326E-5,
                 7.63719763789976227360E-6,
                 3.81729326499983985646E-6,
                 1.90821271655393892566E-6,
                 9.53962033872796113152E-7,
                 4.76932986787806463117E-7,
                 2.38450502727732990004E-7,
                 1.19219925965311073068E-7,
                 5.96081890512594796124E-8,
                 2.98035035146522801861E-8,
                 1.49015548283650412347E-8,
                 7.45071178983542949198E-9,
                 3.72533402478845705482E-9,
                 1.86265972351304900640E-9,
                 9.31327432419668182872E-10
               ];
  var P = [
            5.85746514569725319540E11,
            2.57534127756102572888E11,
            4.87781159567948256438E10,
            5.15399538023885770696E9,
            3.41646073514754094281E8,
            1.60837006880656492731E7,
            5.92785467342109522998E5,
            1.51129169964938823117E4,
            2.01822444485997955865E2
          ];
  var Q = [
            3.90497676373371157516E11,
            5.22858235368272161797E10,
            5.64451517271280543351E9,
            3.39006746015350418834E8,
            1.79410371500126453702E7,
            5.66666825131384797029E5,
            1.60382976810944131506E4,
            1.96436237223387314144E2
          ];
  var A = [
           8.70728567484590192539E6,
          1.76506865670346462757E8,
          2.60889506707483264896E10,
          5.29806374009894791647E11,
          2.26888156119238241487E13,
          3.31884402932705083599E14,
          5.13778997975868230192E15,
          -1.98123688133907171455E15,
          -9.92763810039983572356E16,
          7.82905376180870586444E16,
          9.26786275768927717187E16
          ];
  var B = [
          /* 1.00000000000000000000E0,*/
          -7.92625410563741062861E6,
          -1.60529969932920229676E8,
          -2.37669260975543221788E10,
          -4.80319584350455169857E11,
          -2.07820961754173320170E13,
          -2.96075404507272223680E14,
          -4.86299103694609136686E15,
          5.34589509675789930199E15,
          5.71464111092297631292E16,
          -1.79915597658676556828E16
          ];
  var R = [
          -3.28717474506562731748E-1,
          1.55162528742623950834E1,
          -2.48762831680821954401E2,
          1.01050368053237678329E3,
          1.26726061410235149405E4,
          -1.11578094770515181334E5
          ];
  var S = [
           /* 1.00000000000000000000E0,*/
          1.95107674914060531512E1,
          3.17710311750646984099E2,
          3.03835500874445748734E3,
          2.03665876435770579345E4,
          7.43853965136767874343E4
          ];
  var a = 0.0;
  var b = 0.0;
  var s = 0.0;
  var w = 0.0;

  var i = 0;

  var MAXL2 = 1022;

  if( x < 0.0 ){
    if( x < -168 ){return undefined;} // overflow of gamma function (loggamma?)
    s = 1.0 - x;
    w = Math.zetaRieC(s);
    b =   Math.sin(0.5*Math.PI*x) 
        * Math.pow(2.0*Math.PI, x)
        * Math.gamma(s) * (1.0 + w) / Math.PI;
    return(b - 1.0);
  }
  if( x >= MAXL2 ){return undefined;} // EDOM x to big

  w = Math.floor(x);
  if( w == x ){
    i = x;
    if( i < 31 ){
      return azetac[i];
    }
  }
  if( x < 1.0 ){
    w = 1.0 - x;
    a = Math.polyEval( x, R, 5 ) / ( w * Math.polyOneEval( x, S, 5 ));
    return a ;
  }

  if( x == 1.0 ){return undefined;}// EDOM

  if( x <= 10.0 ){
    b = Math.pow( 2.0, x ) * (x - 1.0);
    w = 1.0/x;
    s = (x * Math.polyEval( w, P, 8 )) / (b * Math.polyOneEval( w, Q, 8 ));
    return( s );
  }
  if( x <= 50.0 ){
    b = Math.pow( 2.0, -x );
    w = Math.polyEval( x, A, 10 ) / Math.polyOneEval( x, B, 10 );
    w = Math.exp(w) + b;
    return(w);
  }

  s = 0.0;
  a = 1.0;
  do{
    a += 2.0;
    b = Math.pow( a, -x );
    s += b;
  }while( b/s > Math.EPSILON );

  b = Math.pow( 2.0, -x );
  s = (s + b)/(1.0-b);
  return(s);
};
/* Riemann zeta on the real line (-170.6243 <= x <= +127) */
Math.zeta = function(x){
  return Math.zetaRieC(x)+1;
};
/* generalized Laguerre function. */
Math.laguerre = function(a,n,x){
  return Math.gamma(a+n+1)/(Math.gamma(n+1)*Math.gamma(a+1))
          * Math.hyperg(-n,a+1,x);
};

/* exponential integral */
Math.expoInt = function(x){
  var A = [
           -5.350447357812542947283E0,
            2.185049168816613393830E2,
           -4.176572384826693777058E3,
            5.541176756393557601232E4,
           -3.313381331178144034309E5,
            1.592627163384945414220E6
          ];
  var B = [
  /*  1.000000000000000000000E0, */
           -5.250547959112862969197E1,
            1.259616186786790571525E3,
           -1.756549581973534652631E4,
            1.493062117002725991967E5,
           -7.294949239640527645655E5,
            1.592627163384945429726E6
          ];
  var A2 = [
           -2.106934601691916512584E0,
            1.732733869664688041885E0,
           -2.423619178935841904839E-1,
            2.322724180937565842585E-2,
            2.372880440493179832059E-4,
           -8.343219561192552752335E-5,
            1.363408795605250394881E-5,
           -3.655412321999253963714E-7,
            1.464941733975961318456E-8,
            6.176407863710360207074E-10
           ];
  var B2 = [
  /* 1.000000000000000000000E0, */
           -2.298062239901678075778E-1,
            1.105077041474037862347E-1,
           -1.566542966630792353556E-2,
            2.761106850817352773874E-3,
           -2.089148012284048449115E-4,
            1.708528938807675304186E-5,
           -4.459311796356686423199E-7,
            1.394634930353847498145E-8,
            6.150865933977338354138E-10
           ];

var A3 = [
           -7.657847078286127362028E-1,
            6.886192415566705051750E-1,
           -2.132598113545206124553E-1,
            3.346107552384193813594E-2,
           -3.076541477344756050249E-3,
            1.747119316454907477380E-4,
           -6.103711682274170530369E-6,
            1.218032765428652199087E-7,
           -1.086076102793290233007E-9
         ];
var B3 = [
  /* 1.000000000000000000000E0, */
           -1.888802868662308731041E0,
            1.066691687211408896850E0,
           -2.751915982306380647738E-1,
            3.930852688233823569726E-2,
           -3.414684558602365085394E-3,
            1.866844370703555398195E-4,
           -6.345146083130515357861E-6,
            1.239754287483206878024E-7,
           -1.086076102793126632978E-9
         ];
var A4 = [
           -2.458119367674020323359E-1,
           -1.483382253322077687183E-1,
            7.248291795735551591813E-2,
           -1.348315687380940523823E-2,
            1.342775069788636972294E-3,
           -7.942465637159712264564E-5,
            2.644179518984235952241E-6,
           -4.239473659313765177195E-8
         ];
var B4 = [
  /* 1.000000000000000000000E0, */
           -1.044225908443871106315E-1,
           -2.676453128101402655055E-1,
            9.695000254621984627876E-2,
           -1.601745692712991078208E-2,
            1.496414899205908021882E-3,
           -8.462452563778485013756E-5,
            2.728938403476726394024E-6,
           -4.239462431819542051337E-8
         ];
var A5 = [
           -1.373215375871208729803E0,
           -7.084559133740838761406E-1,
            1.580806855547941010501E0,
           -2.601500427425622944234E-1,
            2.994674694113713763365E-2,
           -1.038086040188744005513E-3,
            4.371064420753005429514E-5,
            2.141783679522602903795E-6
         ];
var B5 = [
  /* 1.000000000000000000000E0, */
            8.585231423622028380768E-1,
            4.483285822873995129957E-1,
            7.687932158124475434091E-2,
            2.449868241021887685904E-2,
            8.832165941927796567926E-4,
            4.590952299511353531215E-4,
           -4.729848351866523044863E-6,
            2.665195537390710170105E-6
         ];
var A6 = [
            1.981808503259689673238E-2,
           -1.271645625984917501326E0,
           -2.088160335681228318920E0,
            2.755544509187936721172E0,
           -4.409507048701600257171E-1,
            4.665623805935891391017E-2,
           -1.545042679673485262580E-3,
            7.059980605299617478514E-5
         ];
var B6 = [
  /* 1.000000000000000000000E0, */
            1.476498670914921440652E0,
            5.629177174822436244827E-1,
            1.699017897879307263248E-1,
            2.291647179034212017463E-2,
            4.450150439728752875043E-3,
            1.727439612206521482874E-4,
            3.953167195549672482304E-5
         ];
var A7 = [
            1.212561118105456670844E-1,
           -5.823133179043894485122E-1,
            2.348887314557016779211E-1,
           -3.040034318113248237280E-2,
            1.510082146865190661777E-3,
           -2.523137095499571377122E-5
         ];
var B7 = [
  /* 1.000000000000000000000E0, */
           -1.002252150365854016662E0,
            2.928709694872224144953E-1,
           -3.337004338674007801307E-2,
            1.560544881127388842819E-3,
           -2.523137093603234562648E-5
         ];

  var f = 0.0;
  var w = 0.0;
  if(x <= 0.0){return undefined;} // EDOM
  else if(x < 2.0){
    f = Math.polyEval(x,A,5) / Math.polyOneEval(x,B,6);
    return (Math.EM + Math.log(x) + x * f);
  }
  else if(x < 4.0){
    w = 1.0/x;
    f = Math.polyEval(w,A6,7) / Math.polyOneEval(w,B6,7);
    return (Math.exp(x) * w * (1.0 + w * f));
  }
  else if (x < 8.0){
    w = 1.0/x;
    f = Math.polyEval(w,A5,7) / Math.polyOneEval(w,B5,8);
    return (Math.exp(x) * w * (1.0 + w * f));
  }
  else if (x < 16.0){
    w = 1.0/x;
    f = Math.polyEval(w,A2,9) / Math.polyOneEval(w,B2,9);
    return (Math.exp(x) * w * (1.0 + w * f));
  }
  else if (x < 32.0){
    w = 1.0/x;
    f = Math.polyEval(w,A4,7) / Math.polyOneEval(w,B4,8);
    return (Math.exp(x) * w * (1.0 + w * f));
  }
  else if (x < 64.0){
    w = 1.0/x;
    f = Math.polyEval(w,A7,5) / Math.polyOneEval(w,B7,5);
    return (Math.exp(x) * w * (1.0 + w * f));  
  }
  else{
    w = 1.0/x;
    f = Math.polyEval(w,A3,8) / Math.polyOneEval(w,B3,9);
    return (Math.exp(x) * w * (1.0 + w * f));
  }
};

/* dilogarithm */
Math.dilog = function(x){
  var A = [
           4.65128586073990045278E-5,
           7.31589045238094711071E-3,
           1.33847639578309018650E-1,
           8.79691311754530315341E-1,
           2.71149851196553469920E0,
           4.25697156008121755724E0,
           3.29771340985225106936E0,
           1.00000000000000000126E0
        ];
  var B = [
           6.90990488912553276999E-4,
           2.54043763932544379113E-2,
           2.82974860602568089943E-1,
           1.41172597751831069617E0,
           3.63800533345137075418E0,
           5.03278880143316990390E0,
           3.54771340985225096217E0,
           9.99999999999999998740E-1
          ];

  var w = 0.0;
  var y = 0.0;
  var z = 0.0;
  
  var flag = 0;

  if(x<0.){return undefined;} // EDOM
  if(x==1.0){return 0.0;}
  if(x==0.0){return (Math.PI * Math.PI)/6.0;}
  if( x > 2.0 ){
     x = 1.0/x;
     flag |= 2;
  }
  if( x > 1.5 ){
    w = (1.0/x) - 1.0;
    flag |= 2;
  }
  else if( x < 0.5 ){
    w = -x;
    flag |= 1;
  }
  else{w = x - 1.0;}

  y = -w * Math.polyEval( w, A, 7) / Math.polyEval( w, B, 7 );

  if( flag & 1 ){
    y = (Math.PI * Math.PI)/6.0  - Math.log(x) * Math.log(1.0-x) - y;
  }
  if( flag & 2 ){
    z = Math.log(x);
    y = -0.5 * z * z  -  y;
  }

  return y;
};

/*  Fresnel integral */
Math.fresnel = function(xa){
  var sn = [
-2.99181919401019853726E3,
 7.08840045257738576863E5,
-6.29741486205862506537E7,
 2.54890880573376359104E9,
-4.42979518059697779103E10,
 3.18016297876567817986E11
           ];
  var sd = [
/* 1.00000000000000000000E0,*/
 2.81376268889994315696E2,
 4.55847810806532581675E4,
 5.17343888770096400730E6,
 4.19320245898111231129E8,
 2.24411795645340920940E10,
 6.07366389490084639049E11
           ];
  var cn = [
-4.98843114573573548651E-8,
 9.50428062829859605134E-6,
-6.45191435683965050962E-4,
 1.88843319396703850064E-2,
-2.05525900955013891793E-1,
 9.99999999999999998822E-1
           ];

  var cn = [
 3.99982968972495980367E-12,
 9.15439215774657478799E-10,
 1.25001862479598821474E-7,
 1.22262789024179030997E-5,
 8.68029542941784300606E-4,
 4.12142090722199792936E-2,
 1.00000000000000000118E0
           ];
  var fn = [
  4.21543555043677546506E-1,
  1.43407919780758885261E-1,
  1.15220955073585758835E-2,
  3.45017939782574027900E-4,
  4.63613749287867322088E-6,
  3.05568983790257605827E-8,
  1.02304514164907233465E-10,
  1.72010743268161828879E-13,
  1.34283276233062758925E-16,
  3.76329711269987889006E-20
           ];

  var fd = [
/*  1.00000000000000000000E0,*/
  7.51586398353378947175E-1,
  1.16888925859191382142E-1,
  6.44051526508858611005E-3,
  1.55934409164153020873E-4,
  1.84627567348930545870E-6,
  1.12699224763999035261E-8,
  3.60140029589371370404E-11,
  5.88754533621578410010E-14,
  4.52001434074129701496E-17,
  1.25443237090011264384E-20
           ];

  var gn = [
  5.04442073643383265887E-1,
  1.97102833525523411709E-1,
  1.87648584092575249293E-2,
  6.84079380915393090172E-4,
  1.15138826111884280931E-5,
  9.82852443688422223854E-8,
  4.45344415861750144738E-10,
  1.08268041139020870318E-12,
  1.37555460633261799868E-15,
  8.36354435630677421531E-19,
  1.86958710162783235106E-22
           ];
  var gd = [
 /*  1.00000000000000000000E0,*/
  1.47495759925128324529E0,
  3.37748989120019970451E-1,
  2.53603741420338795122E-2,
  8.14679107184306179049E-4,
  1.27545075667729118702E-5,
  1.04314589657571990585E-7,
  4.60680728146520428211E-10,
  1.10273215066240270757E-12,
  1.38796531259578871258E-15,
  8.39158816283118707363E-19,
  1.86958710162783236342E-22
            ];
  var f  = 0.0;
  var g  = 0.0;
  var cc = 0.0;
  var ss = 0.0;
  var c  = 0.0;
  var s  = 0.0;
  var t  = 0.0
  var u  = 0.0;
  var x  = 0.0;
  var x2 = 0.0;
  
  var ret = new Array(2);
  
  var done = function(){
      if( xa < 0.0 ){
        cc = -cc;
        ss = -ss;
      }
      ret[0] = ss;
      ret[1] = cc;
      return ret;
  };
  x = Math.abs(xa);
  x2 = x * x;
  if( x2 < 2.5625 ){
    t = x2 * x2;
    ss = x * x2 * Math.polyEval( t, sn, 5)/Math.polyOneEval( t, sd, 6 );
    cc = x * Math.polyEval( t, cn, 5)/Math.polyEval(t, cd, 6 );
    //goto done;
    return done();
  }
  if( x > 36974.0 ){
    cc = 0.5;
    ss = 0.5;
    //goto done;
    return done();
  }
  x2 = x * x;
  t = PI * x2;
  u = 1.0/(t * t);
  t = 1.0/t;
  f = 1.0 - u * Math.polyEval( u, fn, 9)/Math.polyOneEval(u, fd, 10);
  g = t * Math.polyEval( u, gn, 10)/Math.polyOneEval(u, gd, 11);

  t = Math.PI_2 * x2;
  c = Math.cos(t);
  s = Math.sin(t);
  t = Math.PI * x;
  cc = 0.5  +  (f * s  -  g * c)/t;
  ss = 0.5  -  (f * c  +  g * s)/t;

  if( xa < 0.0 ){
    cc = -cc;
    ss = -ss;
  }
  ret[0] = ss;
  ret[1] = cc;
  return ret
};


/* Generate integer partions of positive real integer.
   Algorithm by Donald Knuth */
Math.partition = function(n){
  var m, q, i, x,b;
  var a = new Array(n+1);
  var ret = new Array();

  if(!Math.isInteger(n) || n < 0){return undefined;}
  if(n == 1 || n == 0){return [[n]];}

  a[0] = 0;
  a[1] = n;

  m = 1;
  q = m ;
 
  while(true){
    var temp = new Array();
    for (i=1;i<=m;i++){
      temp.push(a[i]);
    }
    ret.push(temp)

    if(a[q] == 2){
      a[q] = 1;
      q--;
      m++;
      a[m] = 1;
    }
    else{
      if (q == 0){break;}
      x = a[q] - 1;
      a[q] = x;
      n = m-q+1;
      m = q+1;
      for(; n > x; n -= x){
        a[m] = x;
        m++;
      }
      a[m] = n;
      b = ((n==1)?1:0);
      q = m - b;
    }
  }
  return ret;
};

Math.MAX_FACTORIAL = (function(){
  var max = Number.MAX_VALUE;
  var j   = 1;
  while(max>1){max/=j;j++}
  return j-2;
})();

Math.factorial = function(n){
  if(n < 0 || (typeof n) != 'number' || parseInt(n) != n)return undefined;
  //if(n > Math.MAX_FACTORIAL)return Math.bigFactorial(n);
  if(n == 0)return 1;//just to save some cycles
  var temp =1;
  for(var i=1;i<=n;i++){
    temp = temp*i;
  }
  return temp;
};

Math.doubleFactorial = function(n){
  var ret    = 0.0;
  if(n == 0 || n == -1){
    return 1;
  }
  if(n<0 && Math.isInteger(n) && n%2 == 1){return Number.isNaN;}
  if(Math.isInteger(n) && n>0 && n<Math.MAX_FACTORIAL){
    if(n%2 == 0){
      ret = Math.pow(2,n/2) * Math.factorial(n/2);
    }
    else{
      ret = Math.factorial(n)/ (Math.pow(2,(n-1)/2) * Math.factorial((n-1)/2));
    }
  }
  else{
    if(n<0 || Math.floor(Math.abs(n))%2 == 1){
      var x = (n+1)/2;
      ret = Math.exp(Math.logGamma(x+.5) + Math.LN2*x - Math.log(Math.SQRTPI));
    }
    else{
      return Math.exp(Math.LN2*(n/2) + Math.logGamma((n/2)+1));
    }
  }
  return ret;
};

Math.logDoubleFactorial = function(n){
  var ret    = 0.0;
  if(n == 0 || n == -1){
    return 1;
  }
  if(n<0 && Math.isInteger(n) && n%2 == 1){return Number.isNaN;}
  if(Math.isInteger(n) && n>0 && n<Math.MAX_FACTORIAL){
    if(n%2 == 0){
      ret = Math.log(Math.pow(2,n/2) * Math.factorial(n/2));
    }
    else{
      ret = Math.log(Math.factorial(n)/
           (Math.pow(2,(n-1)/2) * Math.factorial((n-1)/2)));
    }
  }
  else{
    if(n<0 || Math.floor(Math.abs(n))%2 == 1){
      var x = (n+1)/2;
      ret = Math.logGamma(x+.5) + Math.LN2*x - Math.log(Math.SQRTPI);
    }
    else{
      return Math.LN2*(n/2) + Math.logGamma((n/2)+1);
    }
  }
  return ret;
};

Math.logarithm = function(a,base){
  return Math.log(a)/Math.log(base);
};s
Math.log2 = function(a){
  return Math.LOG2E*Math.log(a);
};
Math.log10 = function(a){
  return Math.LOG10E*Math.log(a);
};
Math.uniformDeviate = function(n,rmax){
  return n*(1.0/(rmax+1.0));
};

Math.uniformDeviateRange = function(n,rmin,rmax,RAND_MAX){
  var randmax = RAND_MAX || 0xffffffff;
  return rmin + Math.uniformDeviate(n,randmax) * (rmax - rmin);
};

Math.nBits = function(n){
  if(n > 0){
    return Math.ceil(Math.log2(n));
  }
  return undefined;
};
Math.bitReverse = function(n){
  var l = 0;
  var a = 0;
  var b = n;
  if(   Math.floor(a) < a
     || a >= 0x80000000){return undefined}

  l = Math.nBits(b);

  for(var i=0;i< l;i++){
    a = (a<<1)|(b&1);
    b >>>=1;
  }
  return a;
};


Math.isPow2 = function(N){
  var n = Math.abs(N);
  if(n<2){return false}
  else if(n<=0x80000000){return (n&(n-1))?false:true}
  else if(n < Number.INT_MAX){
    var lg2 = Math.log2(n);
    var flr = Math.floor(lg2);
    if(flr < lg2){return false}
    return true;
  }
  return undefined;
};
Math.nextPow2 = function(N){
  var n = Math.abs(N);
  if(n < Number.INT_MAX){
    var lg2 = Math.log2(n);
    var flr = Math.floor(lg2);
    return Math.pow(2,flr+1);
  }
  return undefined;
};
Number.prototype.truncate = function(n){return Math.truncate(this,n);}
Math.truncate = function(f,n){
  if(!isNaN(f) && !isNaN(n)){
    var pow = Math.pow(10,n);
    if(f.isInteger()){
      return f - (f%pow);
    }
    else{
      return f - (f%(1/pow));
    }
  }
};


//------------------------------deg<->rad<->grad<->grad-----------------------
Math.rad2deg = function(r){
  return (360 * r/(2 * Math.PI));
};
Math.deg2rad = function(d){
  return ((2 * Math.PI * d)/360);
};

Math.grad2rad = function(g){
  return ((2 * Math.PI * g)/400);
};
Math.rad2grad = function(r){
  return (360 * r/(2 * Math.PI));
};

Math.deg2grad = function(d){
  return (d * 400/360);
};
Math.grad2deg = function(g){
  return (g * 360/400);
};
//-----------------------------degrees<->decimal------------------------------

Math.latLongClassic2Decimal = function(deg,min,sec,hem){
  var d = deg;
  var m = (min > 0)?min/60:0;
  var s = (sec > 0)?sec/60/60:0;
  var k = (/[WS]/i.test(hem))?-1:1;
  return (d + m + s)*k;
};
Math.decimal2LatLongClassic = function(deg,dir){
  var intp = parseInt(Math.abs(deg).toString());
  var decp = deg - (intp*1.0);

  var degrees = intp;
  var minutes = 0;
  var seconds = 0;

  var ret  = new Array(3);

  ret[0] = degrees;
  ret[1] = Math.floor(decp*60.0);
  ret[2] = Math.floor((decp * 60 - ret[1]) * 60);
  ret[3] = (deg<0)?((dir == 'latitude')?'S':'E')
                  :((dir == 'longitude')?'N':'W');
  return ret;
};

Math.decimal2LatClassic = function(deg){
  return Math.decimal2LatLongClassic(deg,'latitude');
};
Math.decimal2LongClassic = function(deg){
  return Math.decimal2LatLongClassic(deg,'longitude');
};

Math.cartesian2sphereCoord = function(x,y,z){
  var ret = new Array(3);
  ret[0] = Math.sqrt(x*x + y*y + z*z);   // radius
  ret[1] = z/Math.sqrt(x*x + y*y + z*z); // theta
  ret[3] = Math.atan(y/x);               // alpha

  return ret;
};

Math.cartesian2sphereUnit = function(ex,ey,ez, r,t,a){
  var ret = new Array(3);
  ret[0] = Math.sin(t)*(Math.cos(a)*ex+Math.sin(a)*ey)+Math.cos(t)*ez;//e_radius
  ret[1] = Math.cos(t)*(Math.cos(a)*ex+Math.sin(a)*ey)-Math.sin(t)*ez;//e_theta
  ret[3] = -Math.sin(a)*ex+Math.cos(a)*ey;                            //e_alpha
};

Math.cylinder2cartesianCoord = function(p,a,z){
  var ret = new Array(3);
  ret[0] = p * Math.cos(a); // x
  ret[1] = p * Math.sin(a); // y
  ret[3] = z;
};

Math.cylinder2cartesianUnit = function(ep,ea,ez, alpha){
  var ret = new Array(3);
  ret[0] = Math.cos(alpha) * ep - Math.sin(alpha) * ea; // e_x
  ret[1] = Math.sin(alpha) * ep + Math.cos(alpha) * ea; // e_y
  ret[3] = e_z
};

Math.sphere2cartesianCoord = function(radius,theta,alpha){
  var ret = new Array(3);
  ret[0] = radius * Math.cos(alpha) * Math.sin(theta); // x
  ret[1] = radius * Math.sin(alpha) * Math.cos(theta); // y
  ret[3] = radius * Math.cos(theta);                   // z
};

Math.sphere2cartesianUnit = function(er,et,ea, radius,theta,alpha){
  var ret = new Array(3);
  ret[0] = er * Math.sin(theta)*Math.cos(alpha)
                - ea*Math.sin(alpha)
                + et*Math.cos(theta)*Math.cos(alpha); // e_x
  ret[1] = er * Math.sin(theta)*Math.sin(alpha)
                + ea*Math.cos(alpha)
                + et*Math.cos(theta)*Math.sin(alpha); // e_y
  ret[3] = er * Math.cos(theta) - et*Math.sin(theta); // e_z
};

Math.cylinder2sphereCoord = function(p,a,z){
  var ret = new Array(3);
  ret[0] = Math.sqrt(p*p + z*z); // radius
  ret[1] = Math.atan(p/z);       // theta
  ret[3] = a;                    // alpha
};

Math.cylinder2sphereUnit = function(ep,ea,ez, theta){
  var ret = new Array(3);
  ret[0] = ep * Math.sin(theta) + ez * Math.cos(theta); // e_r
  ret[1] = ep * Math.cos(theta) - ez * Math.sin(theta); // e_t
  ret[3] = ea;                                          // e_a
};

Math.sphere2cylinderCoord = function(radius,theta,alpha){
  var ret = new Array(3);
  ret[0] = radius * Math.sin(theta); // p
  ret[1] = alpha;                    // a
  ret[3] = radius * Math.cos(theta); // z
};

Math.sphere2cylinderUnit = function(er,et,ea, theta){
  var ret = new Array(3);
  ret[0] = er * Math.sin(theta) + et * Math.cos(theta); // e_p
  ret[1] = ea;                                          // e_a
  ret[3] = er * Math.cos(theta) - et * Math.sin(theta); // e_z
};

//------------------------------polar-----------------------------------------

Math.cosh = function(a){
  var t = Math.exp(Math.abs(a));
  return(.5 * (t + 1/t));
};

Math.sinh = function(a){
  var t = Math.exp(Math.abs(a));
  if(a == 0.0){return a;}
  return (a < 0.0)?-0.5*(t-1/t):0.5*(t-1/t);
};

Math.tanh = function(a){
  var t = Math.exp(2.0*Math.abs(a));
  if(a == 0.0){return a;}
  return (a < 0.0)?-(1.0-2.0/(t+1.0)):1.0-2.0/(t+1.0);
};

Math.coth = function(a){
  var t = Math.exp(2.0*Math.abs(a));
  if(a == 0.0){return a;}
  return (a < 0.0)?-(1.0+2.0/(t-1.0)):1.0+2.0/(t-1.0);
};

Math.acosh = function(a){
 if(a < 1.0){return undefined;}
 return Math.log(a+Math.sqrt(a*a-1));
};

Math.asinh = function(a){
  var t = 0.0;
  var sign = 0;
  if(a == 0.0){return a;}
  sign = (a < 0.0)?-1:1;
  t = a * sign;
  return sign*Math.log(t+ Math.sqrt(t*t+1));
};

Math.atanh = function(a){
  if(a > 1.0 || a < -1.0){return undefined}
  return 0.5*Math.log((1.0+a)/(1.0-a));
};

Math.acoth = function(a){
  if((Math.abs(a) < 1.0)){return undefined}
  return 0.5*Math.log((a+1.0)/(a-1.0));
};


Math.cot = function(a){
  return 1/Math.tan(a);
};

Math.acot = function(a){
  return (Math.PI/2)  - Math.atan(a);
};

Math.sec = function(a){
  return 1/Math.cos(a);
};
Math.csc   = function(a){return Math.cosec(a);}
Math.cosec = function(a){
  return 1/Math.sin(a);
};

Math.sem = function(d){
  return Math.sin(d/2)*Math.sin(d/2);
};
Math.asem = function(d){
  return Math.asin(Math.sqrt(d))*2;
};

Math.atan2log = function(x,y,i){
  return (1/i)*Math.log( (x+i*y)/Math.sqrt(x*x + y*y) );
};

if(!Math.atan2){
  Math.atan2 = function(y,x){
    if(x>0){return Math.atan(y/x);}
    if(x<0){
      if(y >= 0){return Math.atan(y/x) + Math.PI;}
      if(y <  0){return Math.atan(y/x) - Math.PI;}
    }
    if(x == 0){
      if(y  > 0){return  Math.PI/2;}
      if(y  < 0){return -Math.PI/2;}
      if(y == 0){return 0}
    }
    
  }
}

Math.nint = function(a){
  var fract = Math.abs(Math.fractionalPart(a));
  var integ = Math.integerPart(a);
  var sign  = Math.sign(a);

  if(isNaN(a)){return Number.NaN;}
  if(fract == .5){
    if(Math.abs(integ)%2 == 0){
      return integ;
    }
    else{
      return sign * (Math.abs(integ)+1);
    }
  }
  else{
    if(fract<.5){
      return integ;
    }
    else{
      return sign * (Math.abs(integ)+1);
    }
  }
};



