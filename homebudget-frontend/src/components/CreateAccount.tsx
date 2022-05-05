import axios from "axios";
import * as React from "react";
import { Transaction } from "../models/transaction";
import InputButton from "./form/InputButton";
import InputText from "./form/InputText";

interface State
{
    name: string,
    description: string,
    creating: boolean,
}

export default class CreateAccount extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            name: "",
            description: "",
            creating: false,
        }
    }

    public render() {
        return <>
            <InputText label="Name"
                value={this.state.name}
                onChange={e => this.setState({ name: e.target.value })}
                disabled={this.state.creating} />
            <InputText label="Description"
                value={this.state.description}
                onChange={e => this.setState({ description: e.target.value })}
                disabled={this.state.creating} />
            <InputButton label="Create Account" onClick={() => this.create()}/>
        </>;
    }

    private create() {
        this.setState({ creating: true });
        axios.post(`https://localhost:7262/account`, {
            name: this.state.name,
            description: this.state.description
        })
        .then(res => {
            console.log(res.data);
            this.setState({
                name: "",
                description: "",
                creating: false
            });
        })
    }
}