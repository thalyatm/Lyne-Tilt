import React from 'react';
import SectionHeading from '../components/SectionHeading';

const About = () => {
  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <SectionHeading title="The Story" />
        
        <div className="prose prose-stone prose-lg mx-auto mb-16">
          <p className="lead text-xl md:text-2xl font-serif text-stone-800 italic text-center mb-12">
            "I exist in the space between the forged metal and the spoken word."
          </p>
          
          <img src="https://picsum.photos/id/64/1200/600" alt="Studio Workspace" className="w-full h-96 object-cover mb-12 grayscale hover:grayscale-0 transition-all duration-700" />
          
          <p>
            My name is Lyne Tilt. I am a jeweller, a writer, and a creative mentor based in Melbourne, Australia.
          </p>
          <p>
            For years, I treated these parts of myself as separate. The artist who spent hours in silence filing silver, and the mentor who loved dissecting the creative process with others. 
          </p>
          <p>
            I realized eventually that they are the same work. Whether I am shaping a piece of brass or helping a client shape their career, the goal is the same: <strong>Reveal the essential form. Remove what is unnecessary. Polish what remains until it sings.</strong>
          </p>
          <p>
            My jewellery is raw, tactile, and imperfect. It celebrates the mark of the hand. My coaching is structured yet intuitive, grounded in a decade of navigating the art world and running a creative business.
          </p>
        </div>

        <div className="bg-stone-100 p-12 text-center">
            <h3 className="font-serif text-2xl mb-6">Credentials & Experience</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
                <div>
                    <h4 className="uppercase tracking-widest font-bold mb-2 text-clay">Education</h4>
                    <p>BFA in Gold & Silversmithing</p>
                    <p>Certified Life Coach</p>
                </div>
                <div>
                    <h4 className="uppercase tracking-widest font-bold mb-2 text-clay">Exhibitions</h4>
                    <p>Radiant Earth (2021)</p>
                    <p>Melbourne Design Week (2022)</p>
                </div>
                 <div>
                    <h4 className="uppercase tracking-widest font-bold mb-2 text-clay">Teaching</h4>
                    <p>Guest Lecturer, RMIT</p>
                    <p>Creator, The Artist's Path</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default About;