import * as React from "react";
import { Route, Switch  } from "react-router";
import { routes } from "../lib/routes";
import PageTransactions from "./transaction/PageTransactions";
import PageCreateTransaction from "./transaction/PageCreateTransaction";
import PageDashboard from "./pages/PageDashboard";
import PageImportCsv from "./import/PageImportCsv";
import PageAccount from "./account/PageAccount";
import { Sidebar } from "./common/Sidebar";
import { Preferences } from "../models/preferences";
import axios from "axios";
import PagePreferences from "./pages/PagePreferences";
import PageAccountOverview from "./account/PageAccountOverview";
import { Api } from "../lib/ApiClient";

interface State {
    preferences: Preferences | "fetching";
}

export default class FairFitPortalApp extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            preferences: "fetching",
        };
    }

    public componentDidMount(): void {
        this.updatePreferences();
    }

    public render() {
        return <>
            <div style={{display: "flex", flexGrow: 1}}>
                <Sidebar preferences={this.state.preferences}/>
                <div style={{ flexGrow: 1, backgroundColor: "#EEE" }}>
                    <Switch>
                        <Route exact path={routes.dashboard()} render={history =>
                            <PageDashboard {...history as any} preferences={this.state.preferences} />} />
                        <Route exact path={routes.importCsv()} render={history =>
                            <PageImportCsv {...history as any} preferences={this.state.preferences} />}/>
                        <Route exact path={routes.transactions()} render={history =>
                            <PageTransactions {...history as any} preferences={this.state.preferences} />}/>
                        <Route exact path={routes.createTransaction()} component={PageCreateTransaction} />
                        <Route exact path={routes.accounts()} component={PageAccountOverview} />
                        <Route exact path={routes.account(":id")} render={history =>
                            <PageAccount {...history as any} preferences={this.state.preferences} updatePreferences={() => this.updatePreferences()} />} />
                        <Route exact path={routes.preferences()} render={history =>
                            <PagePreferences {...history as any} preferences={this.state.preferences} updatePreferences={() => this.updatePreferences()} />} />
                    </Switch>
                </div>
            </div>
        </>;
    }

    private updatePreferences() {
        this.setState({ preferences: "fetching" }, () => Api.Preferences.get()
            .then(result => {
                this.setState({ preferences: result });
            })
            .catch(e => {
                console.log(e);
                this.setState({ preferences: "fetching" });
            })
        );
    }
}
