export const arithmeticLanguage = {
    INFIX_OPS: {
      '+': function(a, b) {
        return a + b;
      },
      '-': function(a, b) {
        return a - b;
      },
      '*': function(a, b) {
        return a * b;
      },
      '/': function(a, b) {
        return a / b;
      },
      ',': function(a, b) {
        return [a] + b;
      }
    },
    PREFIX_OPS: {
      'SQRT': function(expr) {
        return Math.sqrt(expr);
      },
      'POW': function(expr) {
        return Math.pow(expr[0], expr[1]);
      }
    },
    PRECEDENCE: [['SQRT', 'POW'], ['*', '/'], ['+', '-'], [',']],
    GROUP_OPEN: '(',
    GROUP_CLOSE: ')',
    SEPARATOR: ' ',
    SYMBOLS: ['(', ')', '+', '-', '*', '/', ','],
  
    termDelegate: (term: string) => {
      return parseInt(term);
    }
};