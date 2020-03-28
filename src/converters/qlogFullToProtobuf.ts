import { load as protobufLoad, Type as protobufType } from "protobufjs";
import * as path from "path";
import * as qlog from "@quictools/qlog-schema";

export class qlogFullToQlogProtobuf {

    public static async Convert(fileContents:string, filename: string):Promise<Buffer> {

        // convert to camelCase because protobuf.js is not full featured... urgh
        // there is a keepCase option, but only in the CLI version, and it doesn't look at the 'json_name' option... urgh*2
        // https://stackoverflow.com/questions/6660977/convert-hyphens-to-camel-case-camelcase
        // fileContents = fileContents.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); });

        const originalLength = fileContents.length;

        let jsonContents:any = JSON.parse( fileContents );

        let converter = new qlogFullToQlogProtobuf( jsonContents, filename );

        const result = await converter.convert(originalLength);

        return result;
    }

    // TODO: at this point, the Undo isn't perfect yet, just enough to check the conversion is good
    // we have to add an "undoPreprocessQlog" function to get the "real" qlog from this, but I'm feeling lazy at this point, as it's not really needed yet
    public static async Undo(fileContents:Buffer, filename: string):Promise<string> {

        let converter = new qlogFullToQlogProtobuf( fileContents, filename );

        const result = await converter.undo();

        return JSON.stringify(result);
    }

    public static async Compare( originalQlog:string, protobufQlog:Buffer ):Promise<boolean> {

        let converter = new qlogFullToQlogProtobuf( protobufQlog, "" );

        // we compare the preprocessed qlog input (but without conversion to camelcase) 
        // to the undone protobuf (which was converted back from camelcase to using underscores)

        let undone = await converter.undo();
        let orig = await converter.preprocessQlog( JSON.parse(originalQlog), false );

        return converter.compare( orig, undone );
    }

    protected fileContents:any;
    protected filename:string;

    constructor(qlogTrace: any, filename: string) {
        this.fileContents = qlogTrace;
        this.filename = filename;
    }

    protected async loadSchema():Promise<protobufType> {
        // __dirname is in the /out/ directory, which we don't want...
        let protoFilePath = __dirname + "../../../src/converters/types/qlog.proto";

        let pbRoot = await protobufLoad( path.resolve(protoFilePath) );

        return pbRoot.lookupType("qlog.IQLog");
    }

    // because of limitations in protobuf's schema language, we cannot simply map JSON qlog to protobuf qlog
    // this function makes the necessary transformation to go from qlog to protobuf
    // Mainly: eventfields are explicitly set as properties instead of as entries in an array. Similar for ack_ranges
    // TODO: write one for the inverse (not really needed at this time yet)
    protected async preprocessQlog( payloadOrig:any, convertCase:boolean = true ):Promise<any> {

        // just so we get alerted if we don't have one of these
        let supportedEventTypes = [
            "packet_sent",
            "packet_received",
            "datagrams_sent",
            "datagrams_received",
            "frame_parsed",
            "frame_created",
            "data_moved",
            "spin_bit_updated",
            "metrics_updated",
            "parameters_set",
            "packet_dropped"
        ];

        // the .proto definition can't deal with some things, e.g., _ in enum names, or .data fields that can be of different types
        // we deal with that here
        for ( let trace of payloadOrig.traces ) {
            trace.events2 = []; // trace.events is an array of arrays. For protobuf, we need an array of objects

            for ( let evt of trace.events ) {

                const type = evt[2];
                const data = evt[3];

                if ( supportedEventTypes.indexOf( type ) < 0 ) {
                    console.error("qlogFullToProtobuf: Input has event of type that isn't supported yet! skipping", type);
                    continue;
                }
            
                let newEvt:any = {
                    timestamp: evt[0],
                    category: evt[1],
                    type: type
                };

                if ( data && data.packet_type && data.packet_type === "version_negotiation" ){ 
                    data.packet_type = "versionnegotiation";
                }

                if ( data && data.packet_type && data.packet_type === "0RTT" ){ 
                    data.packet_type = "zerortt";
                }

                if ( data && data.packet_type && data.packet_type === "1RTT" ){ 
                    data.packet_type = "onertt";
                }

                // normally, acked_ranges are in the form [[0,1], [2,3]] etc.
                // in protobuf (or at least protobuf.js) this doesn't seem to be supported
                // so make it of this form instead: [ { "range": [0,1] }, { "range": [1,2] } ]
                if ( data && data.frames ) {
                    for ( const frame of data.frames ) {
                        if ( frame.frame_type === qlog.QUICFrameTypeName.ack ) {
                            let newRanges = [];
                            for ( const range of frame.acked_ranges ) {
                                newRanges.push( { range: range } );
                            }

                            frame.acked_ranges = newRanges;

                            // console.log("ACKED RANGES ARE NOW", frame.acked_ranges );
                        }
                    }
                }

                if ( data ) {
                    newEvt[ type ] = data;
                }

                trace.events2.push(newEvt);
            }

            trace.events = trace.events2;
            delete trace.events2;
        }

    

        // let start = process.hrtime();
        if ( convertCase ){
            return this.convertBetweenCases( payloadOrig, "camel" );
        }
        else {
            return payloadOrig;
        }
        // let end = process.hrtime( start );
    }

    protected async convert(DEBUG_originalContentLength:number):Promise<Buffer> {
        // TODO: see https://www.npmjs.com/package/protobufjs#installation

        // console.log("Converting qlog to protobuf", this.filename );

        let qlogMessage = await this.loadSchema();

        let payload = await this.preprocessQlog( this.fileContents );

        // console.log("Converting to camelcase took ", end[0], end[1] / 1000000);

        // Create a new message
        let message = qlogMessage.fromObject(payload); // AwesomeMessage.create(payload); // or use .fromObject if conversion is necessary

        // start = process.hrtime();
        let buffer = qlogMessage.encode(message).finish();
        // end = process.hrtime( start );

        // console.log("Encoding took ", end[0], end[1] / 1000000);

        // console.log("protobuf length is ", buffer.length, DEBUG_originalContentLength, ((buffer.length / DEBUG_originalContentLength)* 100).toFixed(2) + "%" );
    

        return Buffer.from( buffer );
    }

    protected async undo():Promise<any> {

        if ( !(this.fileContents instanceof Buffer) ) {
            console.error("qlogFullToProtobuf:undo : expect input to be in Buffer format!");
            return "ERROR";
        }

        let qlogMessage = await this.loadSchema();

        const buffer = this.fileContents; // in NodeJS, Buffer is a subclass of Uint8Array, which is what we need for protobuf.js

        // Decode an Uint8Array (browser) or Buffer (node) to a message
        // let start = process.hrtime();
        let message = qlogMessage.decode(buffer);
        // let end = process.hrtime( start );

        // console.log("Decoding took ", end[0], end[1] / 1000000);
    
        // start = process.hrtime();
        let obj = qlogMessage.toObject(message, {
            longs: Number,
            enums: String,
            bytes: String,
        });
        // end = process.hrtime( start );

        // console.log("toObject took ", end[0], end[1] / 1000000);

        // start = process.hrtime();
        obj = this.convertBetweenCases( obj, "underscore" );
        // end = process.hrtime( start );

        // console.log("Converting to underscore case took ", end[0], end[1] / 1000000);

        return obj;
    }

    protected compare(original:any, transformed:any):boolean {

        const compareField = (key:string|number, original:any, transformed:any ) => {

            // console.log("Comparing field ", key, original, transformed);

            if ( transformed === undefined ) {
                throw new Error("Transformed did not have this key: " + key + " - " + JSON.stringify(original) );
            }

            if ( Array.isArray(original) ) {

                // const origData = original[key as any];
                // const transformedData = transformed[key];

                if ( original.length !== transformed.length ) {
                    throw new Error("Unequal array lengths " + key + ": " + JSON.stringify(original) + " != " + JSON.stringify(transformed) );
                }

                for ( let i = 0; i < original.length; ++i ) {
                    compareField( key + "@" + i, original[i], transformed[i] );
                }
            }
            else if ( typeof original === "object" ) {
                const keys = Object.keys(original);
                for ( const key of keys ) {
                    compareField( key, original[ key ], transformed[ key ] );
                }
            }
            else {
                if ( transformed != original ) {
                    throw new Error("Values not the same " + key + ": " + original + " != " + transformed );
                }
            }

            return true;
        }

        // want to run over original and see that all fields are in transformed as well, with the same values
        // simply doing JSON.stringify() would be too order-dependent

        const keys = Object.keys( original );
        for ( const key of keys ) {
            try {
                compareField ( key, original[ key ], transformed[ key ] );
            }
            catch(e) {
                console.error("qlogFullToProtobuf:ERROR compare went wrong: non-match found", e);
                return false;
            }
        }

        return true;
    }

    protected convertBetweenCases( obj:any, caseName:"camel"|"underscore" ):any {

        if ( caseName === "camel" ) {
            return JSON.parse( JSON.stringify(obj).replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); }) );
        }
        else {
            // https://stackoverflow.com/questions/6660977/convert-hyphens-to-camel-case-camelcase
            return JSON.parse ( JSON.stringify(obj).replace(/([a-z][A-Z])/g, function (g) { return g[0] + '_' + g[1].toLowerCase() }) );
        }
    }
}