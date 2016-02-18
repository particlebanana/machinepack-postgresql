module.exports = {


  friendlyName: 'Parse native query error',


  description: 'Attempt to identify and parse a raw error from sending a native query and normalize it to a standard error footprint.',


  cacheable: true,


  sync: true,


  inputs: {

    queryType: {
      description: 'The type of query operation this raw error came from.',
      extendedDescription: 'Either "select", "insert", "delete", or "update".  This determines how the provided raw error will be parsed/coerced.',
      moreInfoUrl: 'https://github.com/particlebanana/waterline-query-builder/blob/master/docs/syntax.md',
      required: true,
      example: 'select',// (select|insert|delete|update)
    },

    nativeQueryError: {
      description: 'The error sent back from the database as a result of a native query.',
      extendedDescription: 'This is referring to e.g. the output (`err`) returned through the `error` exit of `sendNativeQuery()` in this driver.',
      required: true,
      example: '==='
    },

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'The normalization is complete.  If the error cannot be normalized into any other more specific footprint, then the catchall footprint will be returned.',
      outputVariableName: 'report',
      outputDescription: 'The `footprint` property is the normalized "footprint" representing the provided raw error.  Conforms to one of a handful of standardized footprint types expected by the Waterline driver interface.   The `meta` property is reserved for custom adapter-specific extensions.',
      example: {
        footprint: {},
        meta: '==='
      }
    },

  },


  fn: function (inputs, exits) {

    var footprint = { identity: 'catchall' };
    switch (inputs.queryType){
      case 'select':
        break;

      case 'insert':
      case 'update':
        // TODO: negotiate `notUnique` error.
        //
        // For implementation help w/ building `columns`, see:
        //  • https://github.com/balderdashy/sails-postgresql/blob/a51b3643777dcf1af5517acbf76e09612d36b301/lib/adapter.js#L1308
        // if (inputs.nativeQueryError.??????) {
        //   footprint.identity = 'notUnique';
        //   footprint.columns = [ 'email_address' ];
        // }
        break;

      case 'delete':
        break;

      default:

    }

    return exits.success({
      footprint: footprint
    });
  }


};
