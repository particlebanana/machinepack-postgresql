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

    client.query(query, function(err, result) {
      if(err) {
        return exits.error(err);
      }

      return exits.success(result.rows);
    });
  },



};
