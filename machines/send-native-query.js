module.exports = {


  friendlyName: 'Send Native Query',


  description: 'Send a compiled query to the PostgreSQL database.',


  cacheable: false,


  sync: false,


  inputs: {

    connection: {
      description: 'A PG client to use for running the query.',
      example: '===',
      required: true
    },

    compiledQuery: {
      description: 'A compiled query object.',
      example: {
        query: 'Select * from users',
        bindings: ['user']
      },
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
    }

  },


  fn: function sendNativeQuery(inputs, exits) {
    var client = inputs.connection;
    var query = inputs.compiledQuery.query;
    var bindings = inputs.compiledQuery.bindings;

    client.query(query, bindings, function query(err, result) {
      if (err) {
        return exits.error(err);
      }

      return exits.success(result.rows);
    });
  }


};
