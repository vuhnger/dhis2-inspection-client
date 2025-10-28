import i18n from '@dhis2/d2-i18n'
import React from 'react'

type ToiletCapturePageProps = {
    inspectorName?: string
}

const ToiletCapturePage: React.FC<ToiletCapturePageProps> = ({ inspectorName }) => {
    return (
        <section>
            <h2>{i18n.t('Toilet availability capture')}</h2>
            <p>
                {inspectorName
                    ? i18n.t('Hi {{name}}, this capture form is under construction.', {
                          name: inspectorName,
                      })
                    : i18n.t('This capture form is under construction. Check back soon!')}
            </p>
        </section>
    )
}

export default ToiletCapturePage
