
import { Container, Row, Col } from 'react-bootstrap';
import './Title.css'

function Title({ title, des1, des2 }) {
  return (
    <Container>
      <Row className="justify-content-center">
        <Col md={8} className="text-center">
          <h2 className='title'>{title}</h2>
          <p className='section-title'>
            {des1} <span className="section-title-color">{des2}</span>
          </p>
        </Col>
      </Row>
    </Container>
  );
}

export default Title;
