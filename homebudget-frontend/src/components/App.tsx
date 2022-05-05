import { History } from "history";
import * as moment from "moment";
import * as React from "react";
import { connect } from "react-redux";
import { Route, Switch  } from "react-router";
import { routes } from "../lib/routes";
import Dashboard from "./Dashboard";
import SampleRoute from "./SampleRoute";
import SiteHeader from "./SiteHeader";

export default class FairFitPortalApp extends React.Component {
    constructor(props: {}) {
        super(props);
    }

    public render() {
        return <>
            <SiteHeader />
            <Switch>
                <Route exact path={routes.dashboard()} component={Dashboard} />
                <Route exact path={routes.sampleRoute(":parameter")} render={props => <SampleRoute routeParams={props.match.params as any}/>} />
            </Switch>
        </>;
    }
}
