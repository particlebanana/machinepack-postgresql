module.exports = {


  friendlyName: 'Describe table',


  description: 'List all the columns that are found in a postgresql table.',


  extendedDescription: '',


  inputs: {

    connectionUrl: {
      description: 'The postgresql connection URL',
      defaultsTo: 'postgres://foo:bar@localhost:5432/machinepack_postgresql',
      example: 'postgres://foo:bar@localhost:5432/machinepack_postgresql',
      required: true
    },

    table: {
      description: 'The name of the table.',
      example: 'direwolves',
      required: true
    }

  },


  defaultExit: 'success',


  exits: {

    error: {
      description: 'Unexpected error occurred.',
    },

    couldNotConnect: {
      description: 'Could not connect to Postgresql server at specified `connectionUrl`.',
      extendedDescription: 'Make sure the credentials are correct and that the server is running.'
    },

    invalidTable: {
      description: 'Provided `table` input is not a valid name for a Postgresql table in the database.',
    },

    success: {
      description: 'Returns an array of columns.',
      example: [{
        fieldName: 'birthday',
        type: 'string', // number, string, boolean, dictionary, or array
        dbType: 'timezone with timestamp',
        indexed: true,
        unique: true,
        primaryKey: false,
        autoIncrement: false
      }]
    }

  },


  fn: function (inputs,exits) {

    // Dependencies
    var pg = require('pg');
    var async = require('async');

    // Rename inputs for clarity
    var table = inputs.table;

    // Build query to get a bunch of info from the information_schema
    // It's not super important to understand it only that it returns the following fields:
    // [Table, #, Column, Type, Null, Constraint, C, consrc, F Key, Default]
    var query = "SELECT x.nspname || '.' || x.relname as \"Table\", x.attnum as \"#\", x.attname as \"Column\", x.\"Type\"," +
      " case x.attnotnull when true then 'NOT NULL' else '' end as \"NULL\", r.conname as \"Constraint\", r.contype as \"C\", " +
      "r.consrc, fn.nspname || '.' || f.relname as \"F Key\", d.adsrc as \"Default\" FROM (" +
      "SELECT c.oid, a.attrelid, a.attnum, n.nspname, c.relname, a.attname, pg_catalog.format_type(a.atttypid, null) as \"Type\", " +
      "a.attnotnull FROM pg_catalog.pg_attribute a, pg_namespace n, pg_class c WHERE a.attnum > 0 AND NOT a.attisdropped AND a.attrelid = c.oid " +
      "and c.relkind not in ('S','v') and c.relnamespace = n.oid and n.nspname not in ('pg_catalog','pg_toast','information_schema')) x " +
      "left join pg_attrdef d on d.adrelid = x.attrelid and d.adnum = x.attnum " +
      "left join pg_constraint r on r.conrelid = x.oid and r.conkey[1] = x.attnum " +
      "left join pg_class f on r.confrelid = f.oid " +
      "left join pg_namespace fn on f.relnamespace = fn.oid " +
      "where x.relname = '" + table + "' order by 1,2;";

    // Get Sequences to test if column auto-increments
    var autoIncrementQuery = "SELECT t.relname as related_table, a.attname as related_column, s.relname as sequence_name " +
      "FROM pg_class s JOIN pg_depend d ON d.objid = s.oid JOIN pg_class t ON d.objid = s.oid AND d.refobjid = t.oid " +
      "JOIN pg_attribute a ON (d.refobjid, d.refobjsubid) = (a.attrelid, a.attnum) JOIN pg_namespace n ON n.oid = s.relnamespace " +
      "WHERE s.relkind = 'S' AND n.nspname = 'public';";

    // Get Indexes
    var indiciesQuery = "SELECT t.relname as table_name, i.relname as index_name, a.attname as column_name FROM " +
      "pg_class t, pg_class i, pg_index ix, pg_attribute a WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid " +
      "AND a.attnum = ANY(ix.indkey) AND t.relkind = 'r' AND t.relname like '" + table + "' ORDER BY t.relname, i.relname;";

    // Create a new postgresql client
    var client = new pg.Client(inputs.connectionUrl);

    async.auto({

      // Create client connection
      createConnection: function(next) {
        client.connect(next);
      },

      // Run the initial info query
      infoQuery: ['createConnection', function(next) {
        client.query(query, function(err, queryResults) {
          if(err) return next(err);

          // Return an empty array as the error so we can short-circuit everything
          // and just return the empty array
          if(!queryResults.rows.length) return next([]);

          return next(null, queryResults.rows);
        });
      }],

      // Run the sequences query
      sequencesQuery: ['infoQuery', function(next, results) {
        var infoQuery = results.infoQuery;

        // Run Query to get Auto Incrementing sequences
        client.query(autoIncrementQuery, function(err, queryResults) {
          if(err) return next(err);

          // Attach autoIncrement flag to the columns
          queryResults.rows.forEach(function(row) {
            if(row.related_table !== table) return;

            // Look through info query results and see if related_column exists
            infoQuery.forEach(function(column) {
              if(column.Column !== row.related_column) return;
              column.autoIncrement = true;
            });
          });

          return next(null, infoQuery);
        });
      }],

      // Run the indicies query
      indiciesQuery: ['sequencesQuery', function(next, results) {
        var sequenceQuery = results.sequencesQuery;

        // Run Query to get Indexed values
        client.query(indiciesQuery, function(err, queryResults) {
          if(err) return next(err);

          // Loop through indicies and see if any match
          queryResults.rows.forEach(function(index) {
            sequenceQuery.forEach(function(column) {
              if(column.Column !== index.column_name) return;
              column.indexed = true;
            });
          });

          return next(null, sequenceQuery);
        });
      }],

      // Normalize the query results into an array of columns
      normalizeResults: ['indiciesQuery', function(next, results) {
        var data = results.indiciesQuery;

        var arr = data.map(function(column) {
          var obj = {};

          // Set fieldName
          obj.fieldName = column.Column;

          // Set Type
          switch(column.Type) {

            // Number types
            case 'smallint':
            case 'integer':
            case 'bigint':
            case 'decimal':
            case 'numeric':
            case 'real':
            case 'double precision':
            case 'smallserial':
            case 'bigserial':
              obj.type = 'number';
              break;

            // String types
            case 'character':
            case 'char':
            case 'varchar':
            case 'character varying':
            case 'text':
              obj.type = 'string';
              break;

            // Date types
            case 'timestamp':
            case 'timestamp without time zone':
            case 'timestamp with time zone':
            case 'time':
            case 'time without time zone':
            case 'time with time zone':
            case 'date':
            case 'interval':
              obj.type = 'string';
              break;

            // Boolean type
            case 'boolean':
              obj.type = 'boolean';
              break;

            // JSON type
            case 'json':
              obj.type = 'dictionary';
              break;

            // Array types
            case 'array':
              obj.type = 'array';
              break;

            // Everything else make a string
            default:
              obj.type = 'string';
              break;
          };

          // Store the original db type as well
          obj.dbType = column.Type;

          // Check for index
          if(column.indexed) {
            obj.indexed = true;
          } else {
            obj.indexed = false;
          }

          // Check for Unique Constraint
          if(column.Constraint && column.C === 'u') {
            obj.unique = true;
            obj.indexed = true;
          } else {
            obj.unique = false;
          }

          // Check for Primary Key
          if(column.Constraint && column.C === 'p') {
            obj.primaryKey = true;
            obj.unique = true;
            obj.indexed = true;
          } else {
            obj.primaryKey = false;
          }

          // Check for autoIncrement
          if(column.autoIncrement) {
            obj.autoIncrement = true;
          } else {
            obj.autoIncrement = false;
          }

          return obj;
        });

        setImmediate(function() {
          return next(null, arr);
        });
      }]

    },

    function(err, results) {

      // Close the client connection
      client.end();

      if(err) {
        if(err === []) return exits.success([]);
        return exits.error(err);
      }

      return exits.success(results.normalizeResults);
    });
  }

};
