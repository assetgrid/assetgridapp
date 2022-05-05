import { History } from "history";
import * as React from "react";
import { connect } from "react-redux";
import { Link, useRouteMatch } from "react-router-dom";
import { GetRemoteValue } from "../lib/Remote";
import { routes } from "../lib/routes";

type RouteParameters = {
    parameter: string,
};

class SampleRoute extends React.Component<{routeParams: RouteParameters}> {
    constructor(props: {routeParams: RouteParameters}) {
        super(props);
    }
    public render() {

        return <section className="section container">
            <h1>Sample page</h1>
            <p>Sample paragraph</p>

            <p>The parameter is: {this.props.routeParams.parameter}</p>
        </section>;
    }
}

export default SampleRoute;
