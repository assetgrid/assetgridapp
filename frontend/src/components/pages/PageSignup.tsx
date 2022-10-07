import * as React from "react";
import { useNavigate } from "react-router";
import * as Api from "../../lib/ApiClient";
import { routes } from "../../lib/routes";
import Card from "../common/Card";
import InputButton from "../input/InputButton";
import InputText from "../input/InputText";

export default function PageSignup (): React.ReactElement {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [state, setState] = React.useState<"signing-up" | "waiting">("waiting");
    const navigate = useNavigate();
    const [errors, setErrors] = React.useState<{ [key: string]: string[] }>({});

    React.useEffect(() => {
        Api.anyUsers().then(result => {
            if (result.status === 200 && result.data) {
                navigate(routes.dashboard());
            }
        }).catch(null);
    }, []);

    return <section className="page-login">
        <Card title="Create a new account for Assetgrid" isNarrow={true}>
            <InputText value={email}
                label="Email"
                onChange={e => setEmail(e.target.value)}
                disabled={state === "signing-up"}
                errors={errors.Email || Object.keys(errors).length > 0} />
            <InputText value={password}
                password={true}
                label="Password"
                disabled={state === "signing-up"}
                onChange={e => setPassword(e.target.value)} errors={errors.Password || Object.keys(errors).length > 0} />
            <InputButton
                className="is-primary"
                disabled={state === "signing-up"}
                onClick={signUp}>
                Sign up
            </InputButton>
        </Card>
    </section>;

    async function signUp () {
        setState("signing-up");
        const result = await Api.signup(email, password);
        if (result.status === 200) {
            setPassword("");
            navigate(routes.login());
        } else if (result.status === 400) {
            setState("waiting");
            setErrors(result.errors);
        }
    }
}
