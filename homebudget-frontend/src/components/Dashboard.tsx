import { History } from "history";
import * as React from "react";
import { connect, ConnectedProps } from "react-redux";
import { Link } from "react-router-dom";
import { ThunkDispatch } from "redux-thunk";
import Remote, { GetRemoteValue, IsFetched, RemoteState } from "../lib/Remote";
import { routes } from "../lib/routes";
import AccountList from "./AccountList";
import CreateAccount from "./CreateAccount";
import CreateTransaction from "./CreateTransaction";
import TransactionList from "./TransactionList";

/*
 * Custom props and state
 */
interface Props {
    ownProp: string,
}

interface State {
    parameter: string,
    postalCode: string,
}

/*
 * React object class
 */
export default class Dashboard extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            parameter: "",
            postalCode: "",
        };
    }

    public render() {
        return <section className="section container">
            <AccountList />
            <CreateAccount />
            
            <TransactionList />
            <CreateTransaction />

            <h1 className="title is-2">This is an example</h1>
            <p>This project demonstrates a simple project using bulma, typescript, react, redux and react-router</p>

            <h2 className="title is-4 mt-4">API interaction</h2>
            <p>It uses the official danish postal code API, to demonstrate how you can use interact asynchronously with an API.</p>
            <br />
            <div className="field">
                <label className="label">Postal Code</label>
                <div className="field has-addons">
                    <div className="control is-expanded">
                        <input
                            className="input"
                            type="text"
                            placeholder="Postal Code"
                            value={this.state.postalCode}
                            onChange={event => this.setState({ postalCode: event.target.value })}
                        />
                    </div>
                </div>
            </div>

            <h2 className="title is-4 mt-4">URL routing</h2>
            <p>Enter a parameter here and click the link below to go to that page</p>
            <div className="field">
                <label className="label">Parameter</label>
                <div className="field has-addons">
                    <div className="control is-expanded">
                        <input
                            className="input"
                            type="text"
                            placeholder="Parameter"
                            value={this.state.parameter}
                            onChange={event => this.setState({ parameter: event.target.value })}
                        />
                    </div>
                </div>
            </div>

            <Link to={routes.sampleRoute(this.state.parameter)}>{routes.sampleRoute(this.state.parameter)}</Link>

        </section>;
    }
}
