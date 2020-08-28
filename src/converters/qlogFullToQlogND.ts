const Writable = require('stream').Writable;
// const Readable = require('stream').Readable;
const { Readable } = require('stream');

export class qlogFullToQlogND {

    public static async Convert(fileContents:string, filename: string):Promise<Buffer|string> {

        let jsonContents:any = JSON.parse( fileContents );

        let converter = new qlogFullToQlogND( jsonContents, filename );

        const result = await converter.convert();

        return result;
    }

    // public static async Validate( fileContents:string ) {

    //     // needed so we can await for the streams to finish
    //     let resolver:any = undefined;
    //     let p = new Promise(function(resolve, reject){
    //         resolver = resolve;
    //      });

    //     let countedEvents = 0;
    //     let events:any = [];

    //     let input = Readable.from( [fileContents] );

    //     input.on("end", function() {
    //         resolver();

    //         console.log("Total events read: ", countedEvents, events.length );
    //     });
        
    //     input.on("error", function(e:any) { 
    //         console.log("qlogFullToQlogND:validate : error during reading filecontents!", e);
    //         resolver();
    //     });
        
    //     input.pipe(ndjson.parse())
    //     .on('data', function(obj:any) {
    //         ++countedEvents;
    //         // console.log( "COUNTED", countedEvents, obj );

    //         events.push( obj );
    //     })


    //     // let jsonstream = new LDJSONStream({ objectMode: true, maxDocLength: 500000000/*, debug: true*/ }); // max length is 500MB

    //     // jsonstream.pipe(new Writable({
    //     //     objectMode: true,
    //     //     write: function(obj:any, encoding:any, cb:any) {
                
    //     //         ++countedEvents;

    //     //         // if (obj.name === 'baz') {
    //     //         //     console.log(obj);
    //     //         // }
    //     //         // console.log( JSON.stringify(obj) );

    //     //         console.log( "COUNTED", countedEvents );

    //     //         cb();
    //     //         // process.nextTick( cb );
                
    //     //         return false;
    //     //     }
    //     // }));


    //     // // ls.write( fileContents );

    //     // // ls.write('{ "name" : "bar" }\n{ "name" : "baz" }\n');
    //     // try {
    //     //     // jsonstream.write( fileContents );

    //     //     let readable = Readable.from( fileContents );
    //     //     // let readable = Readable.from( ['{ "name" : "robin" }\n{ "name" : "test" }\n'] );


    //     //     // readable.on("data", (chunk:any) => {
    //     //     //     console.log("ROBIN: " + chunk) // will be called once with `"input string"`
    //     //     // });

    //     //     readable.pipe( jsonstream );

    //     //     // jsonstream.write( '{ "name" : "bar" }\n{ "name" : "baz" }\n' );




    //     //     // let readable = new Readable(); //Readable.from( fileContents );

    //     //     // console.log( Object.keys(readable) );

    //     //     // readable.read = function(size:any) {
    //     //     //     console.log("PUSHING STUFF!");

    //     //     //     readable.push( '{ "name" : "bar" }\n{ "name" : "baz" }\n' );
    //     //     //     readable.push( null );
    //     //     // }

    //     //     // readable.pipe( jsonstream );
    //     //     // //readable._read(15);
    //     // }
    //     // catch(e) {
    //     //     console.trace("STACK TRACE WTF?", e );
    //     // }

    //     console.log(" events counted in ND file:", countedEvents );

    //     await p;

    //     return true;
    // }

    protected fileContents:any;
    protected filename:string;

    constructor(qlogTrace: any, filename: string) {
        this.fileContents = qlogTrace;
        this.filename = filename;
    }

    protected async convert():Promise<string> {

        console.log("Transforming event_fields qlogfile to Newline Delimited JSON file", this.filename);

        let output:any = {};

        for ( let key of Object.keys(this.fileContents) ) {
            if ( key !== "traces" ) {
                output[key] = this.fileContents[key];
            }
        }

        output.qlog_version = "draft-02";
        output.qlog_format = "NDJSON";
        
        output.trace = undefined;

        let eventString = "";

        for ( const trace of this.fileContents.traces ) {
            let event_fields = trace.event_fields;

            let newTrace:any = {};
            newTrace.events = [];

            for ( let key of Object.keys(trace) ) {
                if ( key !== "events" && key !== "event_fields" ) {
                    newTrace[key] = trace[key];
                }
            }

            if ( event_fields === undefined ) {
                console.error("qlogFullToQlogNormalJSON:convert : no event_fields found, shouldn't happen! Skipping", this.fileContents);
                continue;
            }

            if ( newTrace.common_fields === undefined ) {
                newTrace.common_fields = {};
            }

            let timeIndex = event_fields.indexOf("relative_time");
            if ( timeIndex === -1 ) {
                timeIndex = event_fields.indexOf("delta_time");
                if ( timeIndex === -1 ) { 
                    timeIndex = event_fields.indexOf("time");
                    newTrace.common_fields.time_format = "absolute";
                }
                else {
                    newTrace.common_fields.time_format = "delta";
                }
            }
            else {
                newTrace.common_fields.time_format = "relative";
            }

            const categoryIndex = event_fields.indexOf("category");
            let typeIndex = event_fields.indexOf("event_type");
            if ( typeIndex < 0 ) {
                typeIndex = event_fields.indexOf("event");
            }
            const dataIndex = event_fields.indexOf("data");

            const triggerIndex = event_fields.indexOf("trigger");

            if ( timeIndex < 0 || categoryIndex < 0 || typeIndex < 0 || dataIndex < 0 ) {
                console.error("qlogFullToQlogNormalJSON:convert : expected fields not found, skipping. ", timeIndex, categoryIndex, typeIndex, dataIndex);
                continue;
            }

            for ( const event of trace.events ) {

                let newEvent:any = {};

                newEvent["time"] = event[ timeIndex ];
                newEvent["name"] = event[ categoryIndex ] + ":" + event[ typeIndex ];
                newEvent["data"] = event[ dataIndex ];

                if ( triggerIndex >= 0 ) {
                    newEvent["data"].trigger = event[ triggerIndex ];
                }

                // newTrace.events.push( newEvent );

                eventString += JSON.stringify( newEvent ) + "\n";
            }

            output.trace = newTrace;
        }

        // console.log( JSON.stringify(output, null, 4) + "\n" + eventString );

        return JSON.stringify(output) + "\n" + eventString;
    }
}