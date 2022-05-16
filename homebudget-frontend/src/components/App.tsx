import * as React from "react";
import { Route, Routes  } from "react-router";
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
                    <Routes>
                        <Route path={routes.dashboard()} element={<PageDashboard preferences={this.state.preferences} />} />
                        <Route path={routes.importCsv()} element={<PageImportCsv preferences={this.state.preferences} />}/>
                        <Route path={routes.transactions()} element={<PageTransactions preferences={this.state.preferences} />}/>
                        <Route path={routes.createTransaction()} element={<PageCreateTransaction />} />
                        <Route path={routes.accounts()} element={<PageAccountOverview />} />
                        <Route path={routes.account(":id")} element={<PageAccount preferences={this.state.preferences} updatePreferences={() => this.updatePreferences()} />} />
                        <Route path={routes.preferences()} element={<PagePreferences preferences={this.state.preferences} updatePreferences={() => this.updatePreferences()} />} />
                    </Routes>
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
