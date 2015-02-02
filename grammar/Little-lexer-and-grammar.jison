/*
   If this grammar differs from the EBNF, this grammar is authoritative
*/
/* 
   Heavily stripped down version of JavaScript (ECMAScript 5.1)
   http://www.opensource.apple.com/source/JavaScriptCore/

*/
/*
   This grammar has no conflicts. Please leave it so.
*/
%lex
/*number	[+-]?([0-9]+|[0-9]*"."[0-9]+([eE][-+]?[0-9]+)?)*/
/* It is impossible to parse signed numbers in flex directly if you implement
   addition/subtraction, too and don't want to rely on whitspace.
   Examples with signed number like the one above:
   123+321e-2   -> parse error: + is either an addition or belongs to the number
   123 + 321e-2 -> good: addition
   123  +321e-2 -> parse error: no operand
   123++321e-2  -> parse error: ++ is either a prefix "++", a postfix "++",
                                or the first '+' is an addition and the second
                                one belongs to the number
   and so on.
   Solution: replace the sign of the number with unary operators. The cost
   is neglible and the result usable.
*/

/* divided in parts to ease later addition of other bases */

/* decimal digits */
DDS [0-9]
/* non-zero decimal digits. the number is either zero or starts 
   with something different from zero.
   Too strict? */
NZD [1-9]
/* signed integer, may start with a zero */
DSI [-+]?{DDS}
/* exponent indicator */
DEI [eE] /* [pP] for other encodings with a decimal encoded exponent */
/* decimal exponent for decimal numbers */
DEP {DEI}{DSI}
/* significand. Either zero or something starting with a non-zero.
   Again: too strict? */
DIL [0]|({NZD}{DDS}*)

/* complete IEEE-754 number */
decimalnumber (({DIL}\.{DDS}*{DEP}?)|(\.{DDS}{DEP}?)|({DIL}{DEP}?))

/* There is no extra symbol for imaginary numbers, just a little indicator
   at the end */
imaginarydecimalnumber {decimalnumber}[i]


/* Adding escapes to string literals is a bit more complex than just parsing
   anything between two characters (single or double quote) accepting every
   character as valid except the limiting quotes. But not as complex as the
   last sentence. */

/* The minimum for newline, tabs, quotes and the escape character '\' 
   itself. Support for multi-char escapes like hex- and unicode-escapes
   is planned but not yet implemented. It needs a kind of "mini-parser" inside
   the lexer. See for example:
   http://stackoverflow.com/questions/5418181/flex-lex-encoding-strings-with-escaped-characters
   and
   http://flex.sourceforge.net/manual/Start-Conditions.html#Start-Conditions
   scroll down for a lengthy example for string parsing with escapes
 */
escapechar [\'\"\\bfnrtv]
/* Together with the escape character '\' we got all we need */
escape \\{escapechar}
/* we want to allow both, single and double quote delimited strings, so 
   the acceptable print-characters need to be parted in two groups.
   The printable characters are every character except the delimiter.
   I see no actual reason to forbid linebreaks inside a string (the 
   semicolon is mandatory in Little making linebreaks inside nearly
   everything not a large problem) which leaves the quotes as the single
   characters to be avoided--together with the escape indicator, of course .*/
acceptedcharssingle [^\'\\]+
acceptedcharsdouble [^\"\\]+
/* group with escapes */
stringsingle {escape}|{acceptedcharssingle}
stringdouble {escape}|{acceptedcharsdouble}
/* add quotes and put all together. Empty strings are allowed */
stringliteral (\'{stringsingle}*\')|(\"{stringdouble}*\")

/* This has to run in Flex, too, so ... */
%options flex
%%
\s+                   /* skip whitespace */

"/*"(.|\n|\r)*?"*/" /* ignore multiline comment. No single line comment, sorry */

{stringliteral}  return 'STRING_LITERAL'

"null"           return 'NULLTOKEN'
"true"           return 'TRUETOKEN'
"false"          return 'FALSETOKEN'

/* only the minimum */
"break"		 return 'BREAK'
"case"		 return 'CASE'
"default"	 return 'DEFAULT'
"for"		 return 'FOR'
"let"		 return 'LET'    /* define a variable */
"continue"	 return 'CONTINUE'
"define"	 return 'DEFINE' /* define a function */
"return"	 return 'RETURN'
"if"		 return 'IF'
"do"		 return 'DO'
"while"		 return 'WHILE'
"else"		 return 'ELSE'
"switch"	 return 'SWITCH'

/* reach external files */
"include"	 return 'INCLUDE'

/* Reserved for future use */
"static"   {throw new SyntaxError("Reserved word");} /* JavaScript style      */
"global"   {throw new SyntaxError("Reserved word");} /* change according to   */ 
"const"    {throw new SyntaxError("Reserved word");} /* language if different */
"int"      {throw new SyntaxError("Reserved word");}
"float"    {throw new SyntaxError("Reserved word");}
"rat"      {throw new SyntaxError("Reserved word");}
"char"     {throw new SyntaxError("Reserved word");}
"matrix"   {throw new SyntaxError("Reserved word");}
"array"    {throw new SyntaxError("Reserved word");}


/* Variable and function names must not start with a digit 
   The characters '$' and '@' have no special meaning,
   they exist for convenience only */
[a-zA-Z_$@][a-zA-Z0-9_]*	return 'IDENTIFIER'
/* Decimal floats. Make integers/rationals special here or in the
   number-parser? */
{decimalnumber}                 return 'NUMBER_LITERAL'
/* an imaginary number gets marked with a lower-case 'i' at the end;
   without spaces in between */
{imaginarydecimalnumber}        return 'IMAGINARY_LITERAL'

/* Single characters gets send directly, multiple characters get 
   an aptly named token */
"=="     return 'EQEQ' 
"!="     return 'NE'
/* Implement strict equality test? */
"==="    return 'STREQ'
"!=="    return 'STRNEQ'
"<"      return "<"
">"      return ">"
"<="     return 'LE'
">="     return 'GE'
"||"     return 'OR'
"&&"     return 'AND'
"++"     return 'PLUSPLUS'
"--"     return 'MINUSMINUS' 
"<<"     return 'LSHIFT'
/* To differ between signed and unsigend right shift
   seemed reasonable at the time of writing. Is it still? */
">>"     return 'RSHIFT'
">>>"    return 'URSHIFT'
"+="     return 'PLUSEQUAL'
"-="     return 'MINUSEQUAL'
"**="    return 'POWEREQUAL'
"*="     return 'MULTEQUAL'
"/="     return 'DIVEQUAL'
"//="    return 'INTDIVEQUAL'
"<<="    return 'LSHIFTEQUAL'
">>="    return 'RSHIFTEQUAL'
">>>="   return 'URSHIFTEQUAL'
"&="     return 'ANDEQUAL'
"%="     return 'MODEQUAL'
"^="     return 'XOREQUAL'
"|="     return 'OREQUAL'

"**"     return 'POWER'
/* Useful? *
/*".."	 return 'RANGE'*/
/* truncated division */
"//"     return 'INTDIV'
"="      return '='
"*"      return '*'
"/"      return '/'
"-"      return '-'
"+"      return '+'
"^"      return '^'
"!"      return '!'
"%"      return '%'
"&"      return '&'
"|"      return '|'
"("      return '('
")"      return ')'
"["      return '['
"]"      return ']'
"{"      return '{'
"}"      return '}'
"?"      return '?'
":"      return ':'
";"      return ';'
","      return ','
/* no period outside of a number but it is still reserved for future use */
/*"."      return '.'*/
/* Cardinality. Shorthand for "length()". Useful? */
"#"      return '#'
<<EOF>>               return 'EOF'
/* TODO: In implementation handle error here */
.        return 'INVALID'
/lex

%token NULLTOKEN TRUETOKEN FALSETOKEN
%token STRINGLITERAL NUMBERLITERAL IMAGINARYLITERAL

%token CASE DEFAULT SWITCH
%token DO WHILE FOR CONTINUE BREAK
%token IF ELSE
%token DEFINE LET IDENTIFIER
%token RETURN

%token INCLUDE

%token EQEQ NE STREQ STRNEQ LE GE
%token PLUSEQUAL MINUSEQUAL POWEREQUAL MULTEQUAL DIVEQUAL INTDIVEQUAL
%token LSHIFTEQUAL RSHIFTEQUAL URSHIFTEQUAL ANDEQUAL MODEQUAL XOREQUAL
%token OREQUAL

%token OR AND PLUSPLUS MINUSMINUS LSHIFT RSHIFT URSHIFT
%token POWER INTDIV
%token 

/* You have to start somewhere to end somewhere, otherwise everything would
   happen at once and that would be boring */
%start program
%%

/* everything except functions */
statement
    : block
    | variable_statement
    | empty_statement
    | expression_statement
    | if_statement
    | iteration_statement
    | continue_statement
    | break_statement
    | return_statement
    | labelled_statement
    | switch_statement
    ;

/* Does nothing in JavaScript but will change scope in Little */
block
    : "{" statement_list "}"
    ;


statement_list
    : statement_list statement
    |
    ;

/* Using a different indicator for variable and for function definitions to
   avoid confusion with JavaScript (Little-scripts will raise a ReferenceError
   if run in JavaScript). That is intentional. */
/* There is no loose handling of the semicolon in Little. Never. Nowhere. */
variable_statement
    : LET variable_declaration_list ";"
    ;

/* chaining  (a = 2,b,v,d=6;) is allowed. although it might get confusing
   for chains of length greater than a couple of hundred declarations */
variable_declaration_list
    : variable_declaration
    | variable_declaration_list "," variable_declaration
    ;

/* either a naked variable or an assignment*/
/* Loose typing, yes, but only strings, arrays and numbers exist in Little and
   no implicite conversions happen, only explicite ones. 
   Well, there are implicite conversions between numbers but not between
   the other types */
variable_declaration
    : IDENTIFIER
    | IDENTIFIER initialiser
    ;

initialiser
    : "=" assignment_expression
    ;

/* probably not needed anymore? */
empty_statement
    : ";"
    ;

expression_statement
    : expression ";"
    ;

/* Brackets ( {, } ) are mandatory in Little */
/* Standard if */
if_statement
    : IF "(" expression ")" block
    | IF "(" expression ")" block ELSE block
    ;

/* Standard loops */
iteration_statement
    : DO block WHILE "(" expression ")" ";"
    | WHILE "(" expression ")" block
    | FOR "(" expression_opt ";" expression_opt ";" expression_opt ")" block
    ;

/* up to all expressions in a for loop can be empty but it is frowned upon. Use
   while(true) instead  */
expression_opt
    :
    | expression
    ;

/* Standard continue. Don't know if the labelled continue is of much use in Little */
continue_statement
    : CONTINUE ";"
    | CONTINUE IDENTIFIER ";"
    ;

/* Standard break. Don't know if the labelled break is of much use in Little */
break_statement
    : BREAK ";"
    | BREAK IDENTIFIER ";"
    ;

/* Standard return */
return_statement
    : RETURN ";"
    | RETURN expression ";"
    ;

/* Standard switch */
switch_statement
    : SWITCH "(" expression ")" case_block
    ;

case_block
    : "{" case_clauses "}"
    /* Default clause can be anywhere? Hmmm... */
    | "{" case_clauses default_clause case_clauses "}"
    ;

case_clauses
    : case_clauses case_clause
    |
    ;

case_clause
    : CASE expression ":" statement_list
    ;


default_clause
    : DEFAULT ":" statement_list
    ;

/* the label/jump-target of break/continue
   And "goto" if I find out how to implement one in JavaScript */
labelled_statement
    : IDENTIFIER ":" statement
    ;

/* Functions use "define" as the indicator that a function declaration follows.
   There is only one function scope: the global one.
   JavaScript has some different scoping rules for strict mode and eval(), that
   would allow for something resembling the "static" keyword in C.
   Otherwise and until then: */
/* Standard function declaration */
function_declaration
    : DEFINE IDENTIFIER "(" ")" "{" function_body "}"
    | DEFINE IDENTIFIER "(" parameter_list ")" "{" function_body "}"
    ;
/* Only identifiers as parameters, no fancy default values to avoid cluttering */
parameter_list
    : IDENTIFIER
    | parameter_list "," IDENTIFIER
    ;

/* Only statements, no functions inside of functions */
function_body
    : statement_list
    ;

/* The root node. Can be empty */
program
   : include_files source_elements EOF
   ;
/* Include files at the top of the program file only */
include_files
   : include_files include_file
   |
   ;

/* The parentheses are not really necessary, drop? */
/* Including external files is not possible with every JavaScript engine and not
   for every file from every location, hence this function is very restricted in
   in the JavaScript version and might not even exist at all. */
include_file
   : INCLUDE "(" STRING_LITERAL ")" ";"
   ;

source_elements
    : source_elements source_element
    |
    ;

/* Here they come entwined, the statements and the function declarations and
   it is the only place where we can meet them in such intimate togetherness */
source_element
    : statement
    | function_declaration
    ;

/* We have to start somewhere and the most primitive types are a good starting
  point */
primary_expression
    : IDENTIFIER
    | literal         /* numbers, bools, and null (Strings, too. For now) */
    | array_literal
    | "(" expression ")"
    ;
/* this is the right-hand side array-literal */
/* Standard Array with a matrix extra (Matrix syntax like in Octave/Matlab) */
array_literal
    /* empty vector */
    : "[" "]"
    /* vector with content */
    | "[" element_list "]"
    /* matrix with at least two rows (too much syntactic sugar?) */
    | "[" matrix_list "]"
    ;

matrix_list
    /* two rows */
    : element_list ";" element_list
    /* at least the two rows from above plus one new row */
    | matrix_list ";" element_list
    ;

/* a = [1,2,3,4+b,func(w)] */
element_list
    : assignment_expression
    | element_list "," assignment_expression
    ;

/*
    we need something to call a function                  func(a)
    we need something to call a variable                  x
    we need something to call a place in an Array/Matrix  a[i][2]...
    we need to do both and in that order                  func(a)[j][2]...

    we do not need

     a[1][2]...(...)        function call from inside an Array
     a[1][2]...(...)[x][y]  getting inside an array of the return 
                            of a function call from inside an array
                            If I wanted pointer-juggling I would have chosen
                            C instead!
*/
function_call
    /* Take it as one expression like here or part it?
       It is one of two places that allow for it. Still part? */
    : IDENTIFIER arguments array_list
    /* a function call, who would have thought */
    | IDENTIFIER arguments
    ;
array_call
    /* dereference array left-hand*/
    : IDENTIFIER array_list
    ;

/* We could use such a list for the declaration, too and offer a way to build
   multidimensional arrays directly. Multidimensional arrays in a numerical program
   are for matrices and for not much else (I was not able to come up with a single
   one) and matrices get a special treatment already. */
array_list
   : "[" expression "]"
   |  array_list "[" expression "]"
   ;

arguments
    : "(" ")"
    | "(" argument_list ")"
    ;

argument_list
    : assignment_expression
    | argument_list "," assignment_expression
    ;

/* left-hand does not necessarily mean at the very beginning, just on the left
   side of something else, so checks must be implemented to avoid constructs
   like
       "string" = 123;
   although it might make sense in some strange way in some even stranger
   programs not called Little. */
left_hand_side_expression
    : primary_expression
    | function_call
    | array_call
    ; 

postfix_expression
    : left_hand_side_expression
    /* The factorial gets used quite often in a numerical program and deserves
       its own shortcut */
    | left_hand_side_expression "!"
    | left_hand_side_expression PLUSPLUS
    | left_hand_side_expression MINUSMINUS
    ;

unary_expression
    : postfix_expression
    | PLUSPLUS unary_expression
    | MINUSMINUS unary_expression
    /* plus: sign */
    | "+" unary_expression
    /* minus: sign */
    | "-" unary_expression
    /* tilde: not (2^n - x) */
    | "~" unary_expression
    /* exclamation mark: not (logical not like in !a ) */
    | "!" unary_expression
    /* hash: cardinality (shortcut of a length finding function) */
    | "#" unary_expression
    ;

power_expression
    : unary_expression
    /* The character '^' is already taken by the base 2 arithmetic
       shortcuts but "**" is also widely in use */
    | power_expression POWER unary_expression
    ;
multiplicative_expression
    : power_expression
    /* multiplication */
    | multiplicative_expression '*' power_expression
    /* general division (will not get performed immediately if everything else
       is an integer or rational) */
    | multiplicative_expression '/' power_expression
    /* integer division, truncated division: floor(x/y), returns an integer */
    | multiplicative_expression INTDIV power_expression
    /* remainder of a general division */
    | multiplicative_expression '%' power_expression
    ;

additive_expression
    : multiplicative_expression
    /* Addition */
    | additive_expression "+" multiplicative_expression
    /* Subtraction */
    | additive_expression "-" multiplicative_expression
    ;

/* Is it necessary to implememnt both right shifts?
   Is it necessary to restrict it to integers instead of falling back to
   a normal division by 2^n (n an integer)? */
shift_expression
    : additive_expression
    /* left shift "<<": multiplication with 2^n for integers only*/
    | shift_expression LSHIFT additive_expression
    /* signed right shift ">>": division by 2^n for integers only */ 
    | shift_expression RSHIFT additive_expression
    /* unsigned right shift ">>>": division by 2^n for integers only.
       There exist a function to return the remainder of that shift.
       Implemented a special operator for it?  */ 
    | shift_expression URSHIFT additive_expression
    ;

relational_expression
    : shift_expression
    /* lower than */
    | relational_expression "<" shift_expression
    /* greater than */
    | relational_expression ">" shift_expression
    /* lower than or equal */
    | relational_expression LE shift_expression
    /* greater than or equal */
    | relational_expression GE shift_expression
    ;

/* Are the strict version useful in Little */
equality_expression
    : relational_expression
    /* equality test */
    | equality_expression EQEQ relational_expression
    /* non-equality test */
    | equality_expression NE relational_expression
    /* strict equality test (both must be of the same type)*/
    | equality_expression STREQ relational_expression
    /* strict non-equality test (both must be of the same type)*/
    | equality_expression STRNEQ relational_expression
    ;

bitwise_and_expression
    : equality_expression
    /* binary operation: and  for integers only*/
    | bitwise_and_expression "&" equality_expression
    ;

bitwise_xor_expression
    : bitwise_and_expression
    /* binary operation: exclusive or, xor  for integers only*/
    | bitwise_xor_expression "^" bitwise_and_expression
    ;

bitwise_or_expression
    : bitwise_xor_expression
    /* binary operation: inclusive or, or  for integers only*/
    | bitwise_or_expression "|" bitwise_xor_expression
    ;

logical_and_expression
    : bitwise_or_expression
    /* logical operation (bool): and */
    | logical_and_expression AND bitwise_or_expression
    ;

logical_or_expression
    : logical_and_expression
    /* logical operation (bool): or */
    | logical_or_expression OR logical_and_expression
    ;

/* I think it is of not much use but YMMV.
   But please put the logical part in parentheses, it irritates me every time */
conditional_expression
    : logical_or_expression
    | logical_or_expression "?" assignment_expression ":" assignment_expression
    ;
/*
   Caveat: Accepts an assignment to a function call! "func(a) = 123", check in
           code instead of parser
   NOTE: do not forget that it needs to be able to do a x = funct(a)
*/
assignment_expression
    : conditional_expression
    /* this allows for chaining: a = b = c = .... is it really a good idea? */
    | left_hand_side_expression assignment_operator assignment_expression
    ;

assignment_operator
    : '='
    | PLUSEQUAL		/* += */
    | MINUSEQUAL	/* -= */
    | MULTEQUAL		/* *= */
    | DIVEQUAL		/* /= */
    | LSHIFTEQUAL	/* <<=  for integers only? */
    | RSHIFTEQUAL	/* >>=  for integers only? */
    | URSHIFTEQUAL	/* >>>= for integers only? */
    | ANDEQUAL		/* &=  for integers only   */
    | XOREQUAL		/* ^=  for integers only   */
    | OREQUAL		/* |=  for integers only   */
    | MODEQUAL		/* %= */
    | INTDIVEQUAL	/* //= */
    | POWEREQUAL	/* **= */
    ;

/* is a sequence really a good idea? */
expression
    : assignment_expression
    | expression "," assignment_expression
    ;

/* needs to be taken apart earlier */
literal
    : null_literal    /* the string "null" */
    | boolean_literal /* the strings "true" and "false" */
    | numeric_literal /* anything  with digits in it that is not a string */
    | string_literal  /*the string literal is for printing only and needs
                        extra handling(?) */
    ;

null_literal
    : NULLTOKEN
    ;

boolean_literal
    : TRUETOKEN
    | FALSETOKEN
    ;

numeric_literal
    : NUMBER_LITERAL
    | IMAGINARY_LITERAL
    ;

string_literal
    : STRING_LITERAL
    ;

%%

