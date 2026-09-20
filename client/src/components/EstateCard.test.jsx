import React from 'react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { ImageGallery } from './EstateCard'

describe('ImageGallery', () => {
    it('navigates preview images with the left and right arrow keys', async () => {
        const { container } = render(
            <ImageGallery immowebCode={123} images={['first.jpg', 'second.jpg']} />
        )

        fireEvent.click(container.querySelector('img'))

        const previewImage = await waitFor(() => {
            const image = document.querySelector('.ant-image-preview-img')
            expect(image?.getAttribute('src')).toBe('/123/first.jpg')
            return image
        })

        fireEvent.keyDown(window, { key: 'ArrowRight' })
        await waitFor(() => expect(previewImage.getAttribute('src')).toBe('/123/second.jpg'))

        fireEvent.keyDown(window, { key: 'ArrowLeft' })
        await waitFor(() => expect(previewImage.getAttribute('src')).toBe('/123/first.jpg'))
    })

    it('navigates preview images with the wheel without zooming', async () => {
        const { container } = render(
            <ImageGallery immowebCode={123} images={['first.jpg', 'second.jpg']} />
        )

        fireEvent.click(container.querySelector('img'))
        const previewImage = await waitFor(() => {
            const image = document.querySelector('.ant-image-preview-img')
            expect(image?.getAttribute('src')).toBe('/123/first.jpg')
            return image
        })
        const originalTransform = previewImage.style.transform
        let now = 1000
        const clock = jest.spyOn(Date, 'now').mockImplementation(() => now)

        try {
            fireEvent.wheel(previewImage, {deltaY: 120})
            await waitFor(() => expect(previewImage.getAttribute('src')).toBe('/123/second.jpg'))
            expect(previewImage.style.transform).toBe(originalTransform)

            now += 300
            fireEvent.wheel(previewImage, {deltaY: -120})
            await waitFor(() => expect(previewImage.getAttribute('src')).toBe('/123/first.jpg'))
            expect(previewImage.style.transform).toBe(originalTransform)
        } finally {
            clock.mockRestore()
        }
    })
})
