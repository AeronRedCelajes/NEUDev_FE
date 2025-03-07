import React from 'react';
import '../style/home.css'
import { AboutComponent } from './AboutComponent';
import { FeaturesComponent } from './FeaturesComponent';
import { FooterComponent } from './FooterComponent';
import { HeaderComponent } from './HeaderComponent';
import { LandingNavbarComponent } from './LandingNavbarComponent';

export const HomeComponents = () => {
    return (
        <>
            <div className="landing-page">
                <LandingNavbarComponent/>
            
                <div className='home-content'>
                    <div className='header-orange-border'>
                        <div className="header-section">
                            <HeaderComponent/>
                        </div>
                    </div>
                
                    <div className="features-section">
                        <FeaturesComponent/>
                    </div>
                    
                    <div className='about-orange-border'>
                        <div className='about-section'>
                            <AboutComponent />
                        </div>
                    </div>

                    <div className='footer-section'>
                        <FooterComponent/>
                    </div>
                </div>
            </div>
        </>
  )
}