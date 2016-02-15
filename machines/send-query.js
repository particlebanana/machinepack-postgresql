module.exports = {


  friendlyName: 'Send Query',


  description: 'Send a query to a PostgreSQL database.',


  cacheable: false,


  sync: false,


  inputs: {

    connection: {
      description: 'A PG client to use for running the query.',
      example: '===',
      required: true
    },

    query: {
      description: 'An RQL query object.',
      example: {},
      required: true
    }

  },


  exits: {

    success: {
      variableName: 'result',
      description: 'The results of the query.',
      example: [{}]
    },

    error: {
      variableName: 'error',
      description: 'An unexpected error occured.'
    },

    malformed: {
      variableName: 'malformed',
      description: 'A malformed query was used and could not be run.'
    }

  },


  fn: function sendQuery(inputs, exits) {
    var Pack = require('../index');

    // Compile the query
    Pack.compileQuery({
      query: inputs.query
    }).exec({
      error: function error(err) {
        return exits.error(err);
      },
      malformed: function malformed(err) {
        return exits.malformed(err);
      },
      success: function success(compiledQuery) {
        // Run the Query
        Pack.sendNativeQuery({
          connection: inputs.connection,
          compiledQuery: compiledQuery
        }).exec({
          error: function error(err) {
            return exits.error(err);
          },
          malformed: function malformed(err) {
            return exits.malformed(err);
          },
          success: function success(records) {
            return exits.success(records);
          }
        });
      }
    });
  }


};
