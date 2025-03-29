import ansis from "ansis";

export function colorCommand(string: string){
  return ansis.blue(ansis.bold(string));
}