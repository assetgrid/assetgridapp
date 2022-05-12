import axios from "axios";
import * as React from "react";
import { Transaction, TransactionLine, CreateTransaction as CreateTransactionModel } from "../../models/transaction";
import InputAccount from "../form/account/InputAccount";
import InputButton from "../form/InputButton";
import InputNumber from "../form/InputNumber";
import InputText from "../form/InputText";

interface State
{
    sourceId: number | null,
    destinationId: number | null,
    description: string,
    identifier: string,
    created: Date,
    lines: TransactionLine[],
    creating: boolean
}

const defaultState: any = {
    fromId: null,
    toId: null,
    description: "",
    identifier: "",
    lines: [{
        amount: 0,
        description: "",
    }],
    creating: false
};

export default class CreateTransaction extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            ...defaultState,
            created: new Date(),
        }
    }

    public render() {
        return <>
            <h2 className="title is-2">Create Transaction</h2>
            <h3 className="title is-4">Properties</h3>
            <div className="columns">
                <div className="column is-half">
                    <InputText label="Description"
                        value={this.state.description}
                        onChange={e => this.setState({ description: e.target.value })}
                        disabled={this.state.creating} />
                    <div className="columns">
                        <div className="column is-6">
                            <InputAccount label="From"
                                value={this.state.sourceId}
                                disabled={this.state.creating}
                                onChange={account => this.setState({ sourceId: account?.id ?? null})} />
                        </div>
                        <div className="column is-6">
                            <InputAccount label="To"
                                value={this.state.destinationId}
                                disabled={this.state.creating}
                                onChange={account => this.setState({ destinationId: account?.id ?? null})} />
                        </div>
                    </div>
                </div>
                <div className="column is-half">
                    <InputText label="Identifier"
                        value={this.state.identifier}
                        onChange={e => this.setState({ identifier: e.target.value })}
                        disabled={this.state.creating} />
                </div>
            </div>
            
            <h3 className="title is-4">Transaction Lines</h3>
            {this.state.lines.map((line, i) => <div key={i} className="columns">
                <div className="column is-3">
                    <InputNumber label={i == 0 ? "Amount" : undefined}
                        value={line.amount}
                        onChange={e => this.updateLine(i, {
                            ...this.state.lines[i],
                            amount: e.target.valueAsNumber
                        })}
                        disabled={this.state.creating} />
                </div>
                <div className="column">
                    <InputText label={i == 0 ? "Description" : undefined}
                        value={line.description}
                        onChange={e => this.updateLine(i, {
                            ...this.state.lines[i],
                            description: e.target.value
                        })}
                        disabled={this.state.creating} />
                </div>
                {this.state.lines.length > 1 &&
                    <div className="column is-narrow">
                        {i == 0 && <label className="label">&nbsp;</label>}
                        <button className="button"
                            onClick={() => this.setState({ lines: [...this.state.lines.slice(0, i), ...this.state.lines.slice(i + 1)]})}>
                            <span className="icon is-small">
                                <i className="fas fa-trash" aria-hidden="true"></i>
                            </span>
                        </button>
                    </div>
                }
            </div>
            )}
            <div className="buttons">
                <InputButton onClick={() => this.addLine()}>Add line</InputButton>
            </div>

            <h3 className="title is-4">Create Transaction</h3>
            <div className="buttons">
                <InputButton onClick={() => this.create()}>Create and Continue</InputButton>
                <InputButton onClick={() => this.create()}>Create and View Transaction</InputButton>
            </div>
        </>;
    }

    private addLine() {
        this.setState({
            lines: [
                ...this.state.lines,
                {
                    amount: 0,
                    description: ""
                }
            ]
        });
    }

    private updateLine(index: number, newLine: TransactionLine) {
        this.setState({
            lines: [...this.state.lines.slice(0, index),
                newLine,
                ...this.state.lines.slice(index + 1)]
        })
    }

    private create() {
        this.setState({ creating: true });
        axios.post(`https://localhost:7262/Transaction`, {
            sourceId: this.state.sourceId,
            destinationId: this.state.destinationId,
            description: this.state.description,
            identifier: this.state.identifier,
            lines: this.state.lines
        } as CreateTransactionModel)
        .then(res => {
            this.setState(defaultState);
        })
    }
}