import { load as protobufLoad } from "protobufjs";
import * as path from "path";

export class qlogFullToQlogProtobuf {

    public static async Convert(fileContents:string, filename: string):Promise<Buffer|string> {

        // convert to camelCase because protobuf.js is not full featured... urgh
        // there is a keepCase option, but only in the CLI version, and it doesn't look at the 'json_name' option... urgh*2
        // https://stackoverflow.com/questions/6660977/convert-hyphens-to-camel-case-camelcase
        fileContents = fileContents.replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); });

        let jsonContents:any = JSON.parse( fileContents );

        let converter = new qlogFullToQlogProtobuf( jsonContents, filename );

        const result = await converter.convert();

        return result;
    }

    public static async Undo(fileContents:string, filename: string):Promise<Buffer|string> {

        let jsonContents:any = JSON.parse( fileContents );

        let converter = new qlogFullToQlogProtobuf( jsonContents, filename );

        const result = await converter.undo();

        return result;
    }

    protected fileContents:any;
    protected filename:string;

    constructor(qlogTrace: any, filename: string) {
        this.fileContents = qlogTrace;
        this.filename = filename;
    }

    protected async convert():Promise<Buffer> {
        // TODO: see https://www.npmjs.com/package/protobufjs#installation


        // __dirname is in the /out/ directory, which we don't want...
        let protoFilePath = __dirname + "../../../src/converters/types/qlog.proto";
        
        console.log("Converting qlog to protobuf", this.filename, path.resolve(protoFilePath));

        let pbRoot = await protobufLoad( path.resolve(protoFilePath) );

        let AwesomeMessage = pbRoot.lookupType("qlog.IQLog");

 
        // Exemplary payload
        let payloadOrig = { qlog_version: "draft-02-wip", title: "test protobuf", description: "test protobuf desc", 
                        traces: [
                            {
                                vantage_point: {
                                    name: "vantagepoint test 1",
                                    type: "client"
                                },
                                title: "trace 1",
                                description: "trace 1 desc",
                                events: [
                                    {
                                        timestamp: 555,
                                        category: "transport",
                                        type: "datagrams_sent",
                                        data: {
                                            count: 5,
                                            byte_length: 5000
                                        }
                                    },
                                    {
                                        timestamp: 555,
                                        category: "transport",
                                        type: "packet_sent",
                                        data: {
                                            packet_type: "version_negotiation",
                                            header: {
                                                packet_number: 1234,
                                                packet_size: 1500,
                                                payload_length: 1460,

                                                dcid: "deadbeef"
                                            },

                                            frames: [
                                                {
                                                    frame_type: "stream"
                                                }
                                            ],

                                            is_coalesced: false
                                        }
                                    },

                                    {
                                        timestamp: 666,
                                        category: "http",
                                        type: "frame_parsed",
                                        data: {
                                            stream_id: 0,
                                            frame: {
                                                frame_type: "data"
                                            },
                                            byte_length: 50
                                        }
                                    }

                                ]
                            }   
                        ]};

        for ( const trace of payloadOrig.traces ) {
            for ( let evt of trace.events ) {

                if ( evt.data.packet_type && evt.data.packet_type === "version_negotiation" ){ 
                    evt.data.packet_type = "versionnegotiation";
                }

                if ( evt.data.packet_type && evt.data.packet_type === "0RTT" ){ 
                    evt.data.packet_type = "zeroRTT";
                }

                if ( evt.data.packet_type && evt.data.packet_type === "1RTT" ){ 
                    evt.data.packet_type = "oneRTT";
                }

                (evt as any)[ evt.type ] = evt.data;
                delete evt.data;
            }
        }

    
        let payload = JSON.parse( JSON.stringify(payloadOrig).replace(/_([a-z])/g, function (g) { return g[1].toUpperCase(); }) );


        console.log("Verifying");
        // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
        // let errMsg = AwesomeMessage.verify(payload); // doesn't work if we log enums as strings... herpy derpy
        // if (errMsg)
        //     throw Error(errMsg);
 

        console.log("Creating");

        // Create a new message
        let message = AwesomeMessage.fromObject(payload); // AwesomeMessage.create(payload); // or use .fromObject if conversion is necessary
 
        console.log("Encoding");
        // Encode a message to an Uint8Array (browser) or Buffer (node)
        let buffer = AwesomeMessage.encode(message).finish();

        console.log("protobuf length is ", buffer.length, JSON.stringify(payloadOrig).length );
        // ... do something with buffer
    
        // Decode an Uint8Array (browser) or Buffer (node) to a message
        message = AwesomeMessage.decode(buffer);
        // ... do something with message
    
        // If the application uses length-delimited buffers, there is also encodeDelimited and decodeDelimited.
    
        // Maybe convert the message back to a plain object
        let obj = AwesomeMessage.toObject(message, {
            longs: Number,
            enums: String,
            bytes: String,
            // see ConversionOptions
        });

        // https://stackoverflow.com/questions/6660977/convert-hyphens-to-camel-case-camelcase
        obj = JSON.parse ( JSON.stringify(obj).replace(/([a-z][A-Z])/g, function (g) { return g[0] + '_' + g[1].toLowerCase() }) );

        if ( JSON.stringify(payloadOrig) !== JSON.stringify(obj) ) {
            console.error("ERROR: decoding went wrong!");
            console.log( JSON.stringify(payloadOrig) );
            console.log( JSON.stringify(obj) );
        }
        else {
            console.log("reverted operation ", JSON.stringify(obj) );
        }


        return Buffer.from( buffer );
    }

    protected async undo():Promise<string> {

        console.log("ERROR: undo not implemented for protobuf yet!");

        return "TODO: undo protobuf encoding";
    }
}