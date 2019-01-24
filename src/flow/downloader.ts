import {exec, execSync} from "child_process";
import * as path from "path";

export class Downloader{

    public static async DownloadIfRemote(inputPath:string, outputDirectory:string):Promise<string> {

        if( inputPath.indexOf("http") >= 0 || inputPath.indexOf("https") >= 0 ){
            console.log("File is a URL, downloading...", inputPath, outputDirectory );
    
            let randomFilename = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            randomFilename += path.extname( inputPath );
            let outputPath:string = outputDirectory + path.sep + randomFilename;
    
            return Downloader.DownloadAsync( inputPath, outputPath );
        }
        else
            return inputPath;

    } 

    public static DownloadAsync(inputPath:string, outputPath:string):Promise<string>{

        let output:Promise<string> = new Promise<string>( (resolver, rejecter) => {

            let timeoutMin = 1;
            let wgetLocation:string = "wget"; 
            
            let timeoutHappened:boolean = false;
            let timer = setTimeout( function(){ 
                timeoutHappened = true;
                //console.log("|||||||||||||||||||||||||||||||||||||||||||||");
                //console.log("DownloadAsync : timeout happened, downloading next URL", inputPath );
                //console.log("|||||||||||||||||||||||||||||||||||||||||||||");

                rejecter("Timeout, URL could not be reached within " + timeoutMin + " minutes");

            }, timeoutMin * 60 * 1000 ); // if not done after the expected timeout, we will assume the wget call to hang and proceed

            console.log("About to exec download");
            exec( wgetLocation + ` --timeout=${timeoutMin} --tries=2 --retry-connrefused -O ${outputPath} ${inputPath}`, function(error, {}, stderr){
                if( timeoutHappened )
                    return;

                clearTimeout(timer);

                console.log("Execed download");

                if( error ){ 
                    console.log("-----------------------------------------");    
                    console.log("DownloadAsync : ERROR : ", error, stderr, inputPath, outputPath);

                    // on error, wget still writes an empty file (or half-downloaded file), which we want to get rid of 
                    let result = execSync( `rm -f ${outputPath}` ); // we assume this will work. If not, nothing we can do about it either way...
                    console.log(`Removing file ${outputPath} : ${result}`);
                    console.log("-----------------------------------------"); 

                    rejecter( "DownloadAsync : error : " + error );
                }
                else{
                    resolver( outputPath );
                }
            });
        });

        return output;
    }
}