module.exports = {


  friendlyName: 'Rollback Transaction',


  description: 'Rollback a database transaction.',


  cacheable: false,


  sync: false,


  inputs: {

    connection: {
      description: 'A PG client to use for running the query.',
      example: '===',
      required: true
    }

  },


  exits: {

    success: {
      variableName: 'result',
      description: 'Done.'
    },

    error: {
      variableName: 'error',
      description: 'An unexpected error occured.'
    }

  },


  fn: function rollbackTransaction(inputs, exits) {
    var Pack = require('../index');

    Pack.sendNativeQuery({
      connection: inputs.connection.client,
      query: {
        query: 'ROLLBACK',
        bindings: []
      }
    }).exec({
      error: function error(err) {
        return exits.error(err);
      },
      success: function success() {
        return exits.success();
      }
  }


};
