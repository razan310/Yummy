import Title from '../Title/Title';
import './About.css';
import img from './../../assets/img/about.jpg';
import { Card, Col, Container, Row } from 'react-bootstrap';
import { GoCheckCircleFill } from 'react-icons/go';
import img2 from './../../assets/img/about-2.jpg';
import { FaCirclePlay } from 'react-icons/fa6';

function About() {
  return (
    <div id='About'>
      <Title title={'About Us'} des1={'Learn More'} des2={'About Us'} />
      <Container>
        <Row className="g-5 mt-4">
          <Col xs={12} md={12} xl={7} xxl={7} className=''>
            <Card className="aboutImg border-0 ">
              <Card.Img variant="top" src={img} alt="About" className="w-100 aboutImg" />
              <Card.ImgOverlay className="d-flex justify-content-center align-items-center">
              </Card.ImgOverlay>
            </Card>
            <div className='lg-color border border-5 border-color text-center fw-bold fs-4 p-2 mt-3'>
              Book a Table<br/>
              <span className='accent-color'>+1 5589 55488 55</span>
            </div>
          </Col>
          <Col xs={12} md={12} xl={5} xxl={5} className="d-flex flex-column justify-content-center text-start lh-base">
            <p className="text-color">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <ul className="list-unstyled">
              <li>
                <GoCheckCircleFill className='accent-color fs-5' /> Ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </li>
              <li>
                <GoCheckCircleFill className='accent-color fs-5' /> Duis aute irure dolor in reprehenderit in voluptate velit.
              </li>
              <li>
                <GoCheckCircleFill className='accent-color fs-5' /> Ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate trideta storacalaperda mastiro dolore eu fugiat nulla pariatur.
              </li>
            </ul>
            <br />
            <p>
              Ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.
            </p>
            <div className="">
              <img src={img2} alt="about" className="img-fluid" />
              <FaCirclePlay className="position-relative play-icon" />
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default About;
