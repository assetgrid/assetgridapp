import * as Papa from "papaparse";
import * as React from "react";
import { runInThisContext } from "vm";
import { Transaction } from "../../models/transaction";
import InputButton from "../form/InputButton";
import InputCheckbox from "../form/InputCheckbox";
import InputSelect from "../form/InputSelect";
import InputText from "../form/InputText";
import ImportCsv, { CsvImportOptions } from "./ImportCsv";
import { CsvCreateTransaction } from "./ImportModels";
import MapCsvFields, { MappingOptions } from "./MapCsvFields";
import MissingAccounts from "./MissingAccounts";

interface State
{
    data: any[] | null;
    lines: string[];
    transactions: CsvCreateTransaction[] | null;
    csvFile: File | null;
    csvOptions: CsvImportOptions;
    mappingOptions: MappingOptions;

    currentTab: "parse-csv" | "map-columns" | "missing-accounts" | "process";
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
            currentTab: "parse-csv",

            csvFile: null,
            csvOptions: {
                csvDelimiter: "auto",
                csvNewlineCharacter: "auto",
                csvParseHeader: true
            },
            mappingOptions: {
                duplicateHandling: "identifier",
                identifierColumn: null,
                sourceAccountColumn: null,
                sourceAccountIdentifier: "name",
                destinationAccountColumn: null,
                destinationAccountIdentifier: "name",
                amountColumn: null,
            }
        };
    }

    public render() {
        return <section className="section container">
            <div className="box">
                <h2 className="title is-2">Import from CSV file</h2>
                <div className="tabs">
                    <ul>
                        <li className={this.state.currentTab === "parse-csv" ? "is-active" : ""}><a>Upload CSV</a></li>
                        <li className={this.state.currentTab === "map-columns" ? "is-active" : ""}><a>Map columns</a></li>
                        <li className={this.state.currentTab === "missing-accounts" ? "is-active" : ""}><a>Missing accounts</a></li>
                        <li className={this.state.currentTab === "process" ? "is-active" : ""}><a>Import</a></li>
                    </ul>
                </div>
                
                {this.state.currentTab === "parse-csv" && <>
                    <ImportCsv
                        csvFile={this.state.csvFile}
                        csvParsed={(data, lines) => this.setState({ data: data, lines: lines })}
                        optionsChanged={options => this.setState({ csvOptions: options })}
                        fileChanged={file => this.setState({ csvFile: file })}
                        options={this.state.csvOptions}
                    />
                    <div className="buttons">
                        <InputButton onClick={() => this.setState({currentTab: "map-columns"})}>Continue</InputButton>
                    </div>
                </>}
                {this.state.currentTab === "map-columns" && <>
                    {this.state.data != null && <MapCsvFields
                        options={this.state.mappingOptions}
                        transactions={this.state.transactions}
                        data={this.state.data}
                        onChange={(transactions, options) => this.setState({ transactions: transactions, mappingOptions: options })}
                    />}
                    <div className="buttons">
                        <InputButton onClick={() => this.setState({currentTab: "parse-csv"})}>Back</InputButton>
                        <InputButton onClick={() => this.setState({currentTab: "missing-accounts"})}>Continue</InputButton>
                    </div>
                </>}
                {this.state.currentTab === "missing-accounts" && <>
                    {this.state.transactions != null && <MissingAccounts
                        transactions={this.state.transactions}
                        setTransactions={transactions => this.setState({ transactions: transactions })}
                    />}
                    <div className="buttons">
                        <InputButton onClick={() => this.setState({currentTab: "map-columns"})}>Back</InputButton>
                        <InputButton onClick={() => this.setState({currentTab: "process"})}>Continue</InputButton>
                    </div>
                </>}
                {this.state.currentTab === "process" && <>
                    <div className="buttons">
                        <InputButton onClick={() => this.setState({currentTab: "missing-accounts"})}>Back</InputButton>
                        <InputButton>Import</InputButton>
                    </div>  
                </>}
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
