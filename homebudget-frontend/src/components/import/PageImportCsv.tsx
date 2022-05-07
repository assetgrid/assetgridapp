import * as Papa from "papaparse";
import * as React from "react";
import { runInThisContext } from "vm";
import { Transaction } from "../../models/transaction";
import InputButton from "../form/InputButton";
import InputCheckbox from "../form/InputCheckbox";
import InputSelect from "../form/InputSelect";
import InputText from "../form/InputText";
import ImportCsv from "./ImportCsv";
import { CsvCreateTransaction } from "./ImportModels";
import MapCsvFields from "./MapCsvFields";
import MissingAccounts from "./MissingAccounts";

interface State
{
    data: any[] | null;
    lines: string[];
    transactions: CsvCreateTransaction[] | null;
}

/*
 * React object class
 */
export default class PageImportCsv extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            data: null,
            transactions: null,
            lines: [],
        };
    }

    public render() {
        return <section className="section container">
            <div className="box">
                <h2 className="title is-2">Import transactions</h2>
                <ImportCsv onChange={(data, lines) => this.setState({data:data, lines:lines})}/>
                {this.state.data != null && <MapCsvFields
                    transactions={this.state.transactions}
                    data={this.state.data}
                    lines={this.state.lines}
                    onChange={(transactions) => this.setState({transactions: transactions})}
                />}
                {this.state.transactions != null && <MissingAccounts
                    transactions={this.state.transactions}
                    update={() => this.update()}
                />}
            </div>
        </section>;
    }

    private update() {
        this.setState({
            data: [...this.state.data],
            lines: [...this.state.lines],
            transactions: [...this.state.transactions]
        })
    }
}
