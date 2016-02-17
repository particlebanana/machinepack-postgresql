module.exports = {


  friendlyName: 'Send native query',


  description: 'Send a native query to the PostgreSQL database.',


  inputs: {

    connection:
      require('../constants/connection.input'),

    nativeQuery: {
      description: 'A native query for the database.',
      extendedDescription: 'This is oftentimes compiled from Waterline query syntax using "Compile statement", however it could also originate from userland code.',
      example: '*',
      required: true
    },

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'The native query was executed successfully.',
      outputVariableName: 'report',
      outputDescription: 'The `result` property is the result data the database sent back.  The `meta` property is reserved for custom adapter-specific extensions.',
      example: {
        result: '*',
        meta: '==='
      }
    },

    badConnection:
      require('../constants/badConnection.exit'),

    notUnique: {
      friendlyName: 'Not unique',
      description: 'The provided query failed because it would violate one or more uniqueness constraints.',
      outputVariableName: 'report',
      outputDescription: 'The `columns` property is an array containing the names of columns with uniquness constraint violations. The `error` property is a JavaScript Error instance containing the raw error from the database.  The `meta` property is reserved for custom adapter-specific extensions.',
      example: {
        columns: [ 'email_address' ],
        error: '===',
        meta: '==='
      }
    }

  },


  fn: function (inputs, exits) {
    var util = require('util');

    // Validate provided connection.
    if ( !util.isObject(inputs.connection) || !util.isFunction(inputs.connection.release) || !util.isObject(inputs.connection.client) ) {
      return exits.badConnection();
    }

    // Send native query
    inputs.connection.client.query(inputs.nativeQuery.query, inputs.nativeQuery.bindings, function query(err, result) {
      if (err) {
        // TODO: negotiate `notUnique` error.
        //
        // For implementation help w/ building `columns`, see:
        //  • https://github.com/balderdashy/sails-postgresql/blob/a51b3643777dcf1af5517acbf76e09612d36b301/lib/adapter.js#L1308
        return exits.error(err);
      }

      return exits.success(result);
    });
  }


};
