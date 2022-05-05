import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../lib/routes";
import image from "../assets/demopic.png";

class SiteHeader extends React.Component<{}> {
    constructor(props: {}) {
        super(props);
    }

    public render() {
        return <header className="site-header">
            <nav className="navbar is-dark" role="navigation" aria-label="main navigation">
                <div className="container">
                    <div className="navbar-brand">
                        <Link className="navbar-item" to={routes.dashboard()}>
                            <img src={image}
                                alt="Demo Website" width="150" height="80" />
                        </Link>
                        <a role="button" className="navbar-burger" aria-label="menu" aria-expanded="false">
                            <span aria-hidden="true"></span>
                            <span aria-hidden="true"></span>
                            <span aria-hidden="true"></span>
                        </a>
                    </div>
                </div>
            </nav>
        </header>;
    }
}

export default SiteHeader;

