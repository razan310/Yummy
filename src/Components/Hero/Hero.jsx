import Btn from '../Btn/Btn';
import './hero.css';
import img1 from './../../assets/img/hero-img.png';
import { Container, Row, Col } from 'react-bootstrap';

function Hero() {
  return (
    <div id='Home' className='bg-color hero'>
      <Container>
        <Row className='gy-4 align-items-center justify-content-lg-between'>
          <Col lg={5} md={12} className='order-2 order-lg-1 d-flex flex-column justify-content-center'>
            <h1 className='home-title'>Enjoy Your Healthy Delicious Food</h1>
            <p className='home-title-desc'>
              We are a team of talented designers making websites with Bootstrap
            </p>
            <div className='d-flex flex-column align-items-center align-items-lg-start'>
                <Btn />
            </div>
          </Col>
          <Col lg={5} md={12} className='order-1 order-lg-2 d-flex align-items-center'>
            <img src={img1} alt='Hero' className='img-fluid imgAn' />
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default Hero;
