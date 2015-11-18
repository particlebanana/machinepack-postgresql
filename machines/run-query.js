module.exports = {


  friendlyName: 'Run query',


  description: 'Runs a query and returns the values from the database.',


  cacheable: false,


  sync: false,


  inputs: {

    connection: {
      description: 'An active connection to the database',
      example: '===',
      required: true
    },

    query: {
      description: 'A sequel query that can be run on the database',
      example: 'SELECT * FROM table',
      required: true
    },

    values: {
      description: 'An array that will be sent along with the query providing protection against SQL injection attacks.',
      extendedDescription: 'Provides the ability to run parameterized queries by replacing the value in a query with $1 where the number is the array index of the value.',
      example: ['*'],
      defaultsTo: []
    }

  },


  exits: {

    success: {
      variableName: 'result',
      description: 'Done.',
      example: [{}]
    },

  },


  fn: function(inputs, exits) {

    var client = inputs.connection;
    var query = inputs.query;
    var values = inputs.values;

    client.query(query, values, function(err, result) {
      if(err) {
        return exits.error(err);
      }

      return exits.success(result.rows);
    });
  },



};
