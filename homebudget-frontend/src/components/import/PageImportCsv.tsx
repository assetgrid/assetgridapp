import * as Papa from "papaparse";
import * as React from "react";
import { runInThisContext } from "vm";
import InputButton from "../form/InputButton";
import InputCheckbox from "../form/InputCheckbox";
import InputSelect from "../form/InputSelect";
import InputText from "../form/InputText";
import ImportCsv from "./ImportCsv";
import MapCsvFields from "./MapCsvFields";

type DuplicateHandlingOptions = "none" | "identifier" | "rownumber" | "identifier-rownumber" | "row"

interface State
{
    data: any[] | null;
    lines: string[];
}

/*
 * React object class
 */
export default class PageImportCsv extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            data: null,
            lines: [],
        };
    }

    public render() {
        return <section className="section container">
            <div className="box">
                <h2 className="title is-2">Import transactions</h2>
                <ImportCsv onChange={(data, lines) => this.setState({data:data, lines:lines})}/>
                {this.state.data != null && <MapCsvFields data={this.state.data} lines={this.state.lines}/>}
            </div>
        </section>;
    }
}
