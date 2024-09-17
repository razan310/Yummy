import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Btn from '../Btn/Btn';
import './navbar.css'


function NavBar() {
  return (
    <div>
      <Navbar collapseOnSelect expand="lg" className="">
      <Container >
        <Navbar.Brand href="#home" className='fw-bold fs-3 lg-color position-relative dot'>Yummy</Navbar.Brand>
        <Navbar.Toggle aria-controls="responsive-navbar-nav " />
        <Navbar.Collapse id="responsive-navbar-nav" className='justify-content-end mx-4'>
          <Nav className=" gap-3">
            <Nav.Link href="#Home" className='nav-color position-relative'>Home</Nav.Link>
            <Nav.Link href="#About" className='nav-color position-relative' >About</Nav.Link>
            <Nav.Link href="#Menu" className='nav-color position-relative'>Menu</Nav.Link>
            <Nav.Link href="#Events" className='nav-color position-relative'>Events</Nav.Link>
            <Nav.Link href="#Chefs" className='nav-color position-relative' >Chefs</Nav.Link>
            <Nav.Link href="#Gallery" className='nav-color position-relative'>Gallery</Nav.Link>
            <Nav.Link href="#Contact" className='nav-color position-relative'>Contact</Nav.Link>
          </Nav>
        </Navbar.Collapse>
        <Btn/>
      </Container>
      
    </Navbar>
    </div>
  )
}

export default NavBar
