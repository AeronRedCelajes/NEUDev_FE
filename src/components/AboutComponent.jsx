import React from 'react'
import '../style/about.css';

export const AboutComponent = () => {
  return (
    <>
      <div className='header'>
        <p>About Us</p>
      </div>
      <div className='description'>
        <p>We are HANORI, a group of passionate developers—Hanna Condada, Angelica Mae Manliguez, Noriel Achero, and Erikka Marielle Enaje—dedicated to advancing learning through our intelligent code assessment platform. HANORI supports students and educators by providing accurate, real-time feedback and insights on coding proficiency, empowering the next generation of developers to hone their skills and achieve success.</p>
      </div>

      <div className='container-fluid team-container'>
        <div className='row team-row'>
          <div className='col-md-2'>
              <div className='card team-card'>
                  <img src='/src/assets/hana.png' alt="Hannah Condada"/>
                  <div className="card-name">HANNAH CONDADA</div>
                  <div className='card-body'>
                      <p className='role'>Lead UI/UX Design</p>
                      <p className='card-text'>
                          Hannah L. Condada is a 22-year-old Computer Science student at New Era University. You can connect to her on Linkedln and view her project on GitHub.
                      </p>
                      <div className='social-links'>
                        <a href="#"><img src='/src/assets/linkedin1.png' alt="linkedin"/></a> | <a href="#"><img src='/src/assets/github-sign.png' alt="linkedin"/></a>
                      </div>
                  </div>
              </div>
          </div>

          <div className='col-md-2'>
              <div className='card team-card'>
                  <img src='/src/assets/angelica.png' alt="Angelica Mae Manliguez"/>
                  <div className="card-name">ANGELICA MAE MANLIGUEZ</div>
                  <div className='card-body'>
                      <p className='role'>Lead Front-End Developer</p>
                      <p className='card-text'>
                          Angelica Mae A. Manliguez is a 22-year-old Computer Science student at New Era University. You can connect to her on Linkedln and view her project on GitHub.
                      </p>
                      <div className='social-links'>
                        <a href="#"><img src='/src/assets/linkedin1.png' alt="linkedin"/></a> | <a href="#"><img src='/src/assets/github-sign.png' alt="linkedin"/></a>
                      </div>
                  </div>
              </div>
          </div>

          <div className='col-md-2'>
            <div className='card team-card'>
              <img src='/src/assets/erikka.png' alt="Erikka"/>
              <div className="card-name">ERIKKA MARIELLE ENAJE</div>
              <div className='card-body'>
                <p className="role">Lead QA & Asst. UI/UX Design</p>
                <p className="card-text">
                  Erikka Marielle Enaje is a 22-years-old  Computer Science student at New Era University.  You can connect to her on Linkedln and view her project on GitHub.                
                </p>
                <div className="social-links">
                    <a href="#"><img src='/src/assets/linkedin1.png' alt="linkedin"/></a> | <a href="#"><img src='/src/assets/github-sign.png' alt="linkedin"/></a>
                </div>
              </div>
            </div>
          </div>

          <div className='col-md-2'>
              <div className='card team-card'>
                  <img src='/src/assets/noy.png' alt="Noriel Achero"/>
                  <div className="card-name">NORIEL ARCHERO</div>
                  <div className='card-body'>
                      <p className='role'>Lead Back-End Developer</p>
                      <p className='card-text'>
                          Noriel Archero is a 22-year-old Computer Science student at New Era University. You can connect to him on Linkedln and view her project on GitHub.
                      </p>
                      <div className='social-links'>
                       <a href="#"><img src='/src/assets/linkedin1.png' alt="linkedin"/></a> | <a href="#"><img src='/src/assets/github-sign.png' alt="linkedin"/></a>
                      </div>
                  </div>
              </div>
          </div>
          
          <div className='col-md-2'>
              <div className='card team-card'>
                  <img src='/src/assets/aeron.png' alt="Noriel Achero"/>
                  <div className="card-name">AERON RED CELAJES</div>
                  <div className='card-body'>
                      <p className='role'>Asst. Back-End Developer</p>
                      <p className='card-text'>
                          Aeron Red Celajes is a 22-year-old Computer Science student at New Era University. You can connect to him on Linkedln and view her project on GitHub.
                      </p>
                      <div className='social-links'>
                       <a href="#"><img src='/src/assets/linkedin1.png' alt="linkedin"/></a> | <a href="#"><img src='/src/assets/github-sign.png' alt="linkedin"/></a>
                      </div>
                  </div>
              </div>
          </div>

        </div>
      </div>
    </>
  )
}
