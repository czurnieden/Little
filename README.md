#Little

An arbitrary precision calculator in JavaScript

##Quote of the day

>The most important early product on the way to developing a good product is an imperfect version.
>*Freebsd Fortunes 6:  847 of 2171*

##Author(s)
Christoph Zurnieden <czurnieden@gmx.de>

##Installation

```shell
$ git clone https://github.com/czurnieden/Little.git
$ cd Little
$ npm install -g*
```
There is nothing to install yet, we are just starting; the slate is completely empty and clean.

##Usage

Just load the library in `node` or any other ECMA-script 5.1 able interpreter and play around with it.

##Versions
0.0.0 <INITIAL> Reserved Name by starting a Github project. As if somebody else uses a qualifier as a program name.

##Directions

* to make clear to the reader of the sources what the program does and for that goal to reach: 
* put readability over optimizations but give a hint or more of the possible optimization.

Slightly more detailed:

* It should support all numerical functions in `GP/PARI` and then some more, for example the common matrix calculations. If there is lifetime left or somebody takes it over 
* symbolic calculations should be added, too.

So, what *is* planed for now? A most probably very incomplete list but a good start follows. (A lot of it already exists in an [old JavaScript library of the author](http://pragmath.sourceforge.net/), flagged here with an italic *done in old lib*)

* A language, optimized for numerical algorithms, the sentence above about optimizations holds here, too!
* Data types, all of which are needed but not more. Especially
  * Numbers
    * Real numbers *done in old lib*
    * Complex numbers (when the domain of a functions allows for it, every function must accept at least complex numbers) *done in old lib*
    * Rationals *done in old lib*
    * Big integers (we will take Tom Wu's lib, so: partially done)
    * Big reals
    * Big rationals
    * Continued fractions (partially done)
    * Quadratic numbers (also known as Surds)
    * Quaternions *done in old lib*
    * REDC
  * Other typed data types
    * Matrices *done in old lib*
    * Vectors vid. Matrices
    * Bitsets *done in old lib*
    * Polynomials *done in old lib*
  * Untyped or if you will loose, data storage
    * List, a general list easily traversed (ECMA `Array`)
    * Set, a list, sorted and unique to do some set-theoretical stuff *done in old lib*
    * Hashtable, a list of key-value pairs (ECMA `Object` and/or `JSON`)
* All data-types must be able to use all operators and comparing methods, if applicable. *done in old lib*
* All data-types must be able to use all functions, if applicable. *done in old lib*

##The Name?

This program is named after [Joyce Currie Little}(http://www.women.cs.cmu.edu/ada/Resources/Women/#Joyce%20CurrieLittle).

##Why?

The main author wanted to write a more elaborated example of Flex/Bison than the example program `mcalc`. Although quite useful for students to start, it is nothing complete and useful on its own. He (it is quite awkward to write in the third person if you are the one you are talking about ;-) ) tried to make use of Libtommath which also has a basic library for floating point arithmetic.

Then he found out that JISON is able to parse Flex/Bison scripts, too and already in possession of [a large library of numerical functions written in JavaScript}(http://pragmath.sourceforge.net/), it was an easy decision to use JISON instead of Flex/Bison.

A lot of things have been implemented already, you might take a look at his fork of libtommath.

##Why not?
GP/PARI has already been ported to Android, so no actual usability except some pedagogical ones.




