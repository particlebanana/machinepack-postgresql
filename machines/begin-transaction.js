module.exports = {


  friendlyName: 'Begin Transaction',


  description: 'Open a new database transaction.',


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


  fn: function beginTransaction(inputs, exits) {
    var Pack = require('../index');

    Pack.sendNativeQuery({
      connection: inputs.connection.client,
      query: {
        query: 'BEGIN',
        bindings: []
      }
    }).exec({
      error: function error(err) {
        return exits.error(err);
      },
      success: function success() {
        return exits.success();
      }
    });
  }


};
