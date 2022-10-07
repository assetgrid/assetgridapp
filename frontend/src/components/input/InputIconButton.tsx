import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import InputButton from "./InputButton";

interface Props {
    onClick?: React.MouseEventHandler<HTMLButtonElement>
    className?: string
    disabled?: boolean
    icon: IconProp
}

export default function InputIconButton (props: Props): React.ReactElement {
    const { icon, className, ...remainingProps } = props;
    return <InputButton className={`${className ?? ""} icon`} {...remainingProps}>
        <FontAwesomeIcon icon={props.icon} />
    </InputButton>;
}
