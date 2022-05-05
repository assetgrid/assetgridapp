import axios from "axios";
import * as React from "react";
import { Transaction, TransactionLine } from "../models/transaction";
import InputAccount from "./form/InputAccount";
import InputButton from "./form/InputButton";
import InputNumber from "./form/InputNumber";
import InputText from "./form/InputText";

interface State
{
    fromId: number | null,
    toId: number | null,
    description: string,
    identifier: string,
    created: Date,
    lines: TransactionLine[],
    creating: boolean
}

export default class CreateTransaction extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            fromId: null,
            toId: null,
            description: "",
            identifier: "",
            created: new Date(),
            lines: [],
            creating: false,
        }
    }

    public render() {
        return <>
            <InputText label="Description"
                value={this.state.description}
                onChange={e => this.setState({ description: e.target.value })}
                disabled={this.state.creating} />
            <InputAccount label="From"
                value={this.state.fromId}
                disabled={this.state.creating}
                onChange={account => this.setState({ fromId: account?.id ?? null})} />
            <InputAccount label="To"
                value={this.state.toId}
                disabled={this.state.creating}
                onChange={account => this.setState({ toId: account?.id ?? null})} />
            <InputText label="Identifier"
                value={this.state.identifier}
                onChange={e => this.setState({ identifier: e.target.value })}
                disabled={this.state.creating} />
            <div>
                {this.state.lines.map((line, i) => <div key={i}>
                    <InputNumber label="Amount"
                        value={line.amount}
                        onChange={e => this.updateLine(i, {
                            ...this.state.lines[i],
                            amount: e.target.valueAsNumber
                        })}
                    disabled={this.state.creating} />
                    <InputText label="Description"
                        value={line.description}
                        onChange={e => this.updateLine(i, {
                            ...this.state.lines[i],
                            description: e.target.value
                        })}
                        disabled={this.state.creating} />
                </div>
                )}
                <InputButton label="Add line" onClick={() => this.addLine()}/>
            </div>
            <InputButton label="Create Transaction" onClick={() => this.create()}/>
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
            fromId: this.state.fromId,
            toId: this.state.toId,
            description: this.state.description,
            identifier: this.state.identifier,
            lines: this.state.lines
        })
        .then(res => {
            console.log(res.data);
            this.setState({
                fromId: null,
                toId: null,
                description: "",
                identifier: "",
                lines: [],
                creating: false
            });
        })
    }
}