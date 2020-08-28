
export class qlogFullToQlogNormalJSON {

    public static async Convert(fileContents:string, filename: string):Promise<Buffer|string> {

        let jsonContents:any = JSON.parse( fileContents );

        let converter = new qlogFullToQlogNormalJSON( jsonContents, filename );

        const result = await converter.convert();

        return result;
    }

    protected fileContents:any;
    protected filename:string;

    constructor(qlogTrace: any, filename: string) {
        this.fileContents = qlogTrace;
        this.filename = filename;
    }

    protected async convert():Promise<string> {

        console.log("Transforming event_fields qlogfile to normal JSON file", this.filename);

        let output:any = {};

        for ( let key of Object.keys(this.fileContents) ) {
            if ( key !== "traces" ) {
                output[key] = this.fileContents[key];
            }
        }

        output.qlog_version = "draft-02";
        output.qlog_format = "JSON";
        
        output.traces = [];

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

                newTrace.events.push( newEvent );
            }

            output.traces.push( newTrace );
        }

        // console.log( JSON.stringify(output, null, 4) );

        return JSON.stringify(output);
    }
}