import { NavLink } from "react-router"

type NavLinkPagingProps = {
  prev?: string
  next?: string
}

export const NavLinkPaging = (props: NavLinkPagingProps) => (
  <div style={{ display: "flex", justifyContent: "center", gap: "10%" }}>
    {props.prev ? (
      <p>
        <NavLink to={props.prev}>prev</NavLink>
      </p>
    ) : (
      <p>prev</p>
    )}
    |
    {props.next ? (
      <p>
        <NavLink to={props.next}>next</NavLink>
      </p>
    ) : (
      <p>next</p>
    )}
  </div>
)
