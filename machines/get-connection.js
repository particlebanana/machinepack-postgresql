module.exports = {


  friendlyName: 'Get connection',


  description: 'Get a connection from a connection pool.',


  extendedDescription: 'If a pool has not been created, a new one will be made.',


  cacheable: false,


  sync: false,


  inputs: {

    connectionString: {
      description: 'A string containing the credentials needed to connect to a postgresql database.',
      example: 'postgres://localhost:5432',
      required: true
    }

  },


  exits: {

    success: {
      variableName: 'result',
      description: 'Done.',
      example: {
        client: '===',
        release: '==='
      }
    },

    invalidConnection: {
      description: 'The connection string was incorrect or a client could not connect.'
    }

  },


  fn: function(inputs, exits) {

    var pg = require('pg');
    var conString = inputs.connectionString;

    pg.connect(conString, function(err, client, done) {
      if(err) {
        return exits.invalidConnection();
      }

      return exits.success({
        client: client,
        release: done
      });
    });
  }

};
