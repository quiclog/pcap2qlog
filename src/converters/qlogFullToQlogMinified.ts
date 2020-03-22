
export class qlogFullToQlogMinified {

    public static async Convert(fileContents:string, filename: string):Promise<Buffer|string> {

        let jsonContents:any = JSON.parse( fileContents );

        let converter = new qlogFullToQlogMinified( jsonContents, filename );

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

        console.log("Minifying qlogfile", this.filename);

        return JSON.stringify(this.fileContents); // yes, that's it...
    }
}